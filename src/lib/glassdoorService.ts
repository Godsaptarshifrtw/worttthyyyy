export interface GlassdoorReview {
  jobTitle: string;
  rating?: number;
  pros: string;
  cons: string;
  adviceToManagement?: string;
  isRoleSpecific: boolean;
}

export interface GlassdoorCompanyOverview {
  companyName: string;
  overallRating: number;
  reviewCount: number;
  workLifeBalanceRating?: number;
  compensationRating?: number;
  cultureRating?: number;
  careerOpportunitiesRating?: number;
  seniorManagementRating?: number;
  ceoApprovalPercent?: number;
  recommendToFriendPercent?: number;
  ceoName?: string;
  glassdoorUrl: string;
}

export interface GlassdoorResult {
  overview?: GlassdoorCompanyOverview;
  reviews: GlassdoorReview[];
  hasRoleSpecificReviews: boolean;
  targetRole: string;
  source: "apify" | "fallback";
}

/**
 * Checks if a review's job title matches the user's target position
 */
function isTitleMatch(jobTitle: string, targetPosition: string): boolean {
  if (!jobTitle || !targetPosition) return false;
  const jt = jobTitle.toLowerCase();
  const tp = targetPosition.toLowerCase();

  if (jt.includes(tp) || tp.includes(jt)) return true;

  // Keyword overlap
  const stopWords = new Set(["a", "an", "the", "and", "or", "for", "in", "at", "senior", "junior", "lead", "staff", "principal"]);
  const targetTokens = tp
    .split(/[\s/,-]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return targetTokens.some((token) => jt.includes(token));
}

/**
 * Fetches real Glassdoor company overview & reviews via Apify
 */
export async function fetchGlassdoorData({
  company,
  position,
  token,
}: {
  company: string;
  position: string;
  token?: string;
}): Promise<GlassdoorResult | null> {
  const activeToken =
    token ||
    import.meta.env.VITE_APIFY_TOKEN;

  if (!activeToken || !company) return null;

  try {
    const input = {
      companyNames: [company.trim()],
      includeCompanyOverview: true,
      includeReviews: true,
      maxReviews: 8,
      timeoutSecs: 90,
    };

    // 1. Trigger Apify Actor Run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/scrapesage~glassdoor-scraper/runs?token=${activeToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!runResponse.ok) {
      console.warn("Apify start run returned status:", runResponse.status);
      return null;
    }

    const runJson = await runResponse.json();
    const runId = runJson.data?.id;
    if (!runId) return null;

    // 2. Poll for results (up to 45 seconds)
    const maxPolls = 15;
    const pollInterval = 3000;
    let datasetId: string | null = null;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(activeToken)}`
      );
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === "SUCCEEDED") {
        datasetId = statusData.data?.defaultDatasetId;
        break;
      } else if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
        break;
      }
    }

    if (!datasetId) return null;

    // 3. Fetch Scraped Items from Dataset
    const datasetRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(activeToken)}`
    );

    if (!datasetRes.ok) return null;
    const items = await datasetRes.json();
    if (!items || items.length === 0) return null;

    // 4. Parse Overview and Reviews
    let overview: GlassdoorCompanyOverview | undefined;
    const allReviews: GlassdoorReview[] = [];

    for (const it of items) {
      if (it.type === "company") {
        overview = {
          companyName: it.companyName || company,
          overallRating: it.overallRating || 4.0,
          reviewCount: it.reviewCount || 0,
          workLifeBalanceRating: it.ratingWorkLifeBalance,
          compensationRating: it.ratingCompensationAndBenefits,
          cultureRating: it.ratingCultureAndValues,
          careerOpportunitiesRating: it.ratingCareerOpportunities,
          seniorManagementRating: it.ratingSeniorManagement,
          ceoApprovalPercent: it.ceoApprovalPercent,
          recommendToFriendPercent: it.recommendToFriendPercent,
          ceoName: it.ceoName,
          glassdoorUrl:
            it.glassdoorUrl ||
            `https://www.glassdoor.com/Reviews/${encodeURIComponent(company)}-reviews.htm`,
        };
      } else if (it.type === "review" && (it.pros || it.cons)) {
        const roleMatch = isTitleMatch(it.jobTitle || "", position);
        allReviews.push({
          jobTitle: it.jobTitle || "Employee",
          rating: it.rating,
          pros: it.pros || "",
          cons: it.cons || "",
          adviceToManagement: it.adviceToManagement,
          isRoleSpecific: roleMatch,
        });
      }
    }

    // Role-specific check
    const roleSpecificReviews = allReviews.filter((r) => r.isRoleSpecific);
    const hasRoleSpecific = roleSpecificReviews.length > 0;

    return {
      overview,
      reviews: hasRoleSpecific ? roleSpecificReviews : allReviews,
      hasRoleSpecificReviews: hasRoleSpecific,
      targetRole: position,
      source: "apify",
    };
  } catch (error) {
    console.error("Error fetching Glassdoor data via Apify:", error);
    return null;
  }
}
