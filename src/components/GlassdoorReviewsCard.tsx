import React from "react";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Building2,
  ExternalLink,
  Award,
  Users,
  Loader2,
  MessageSquare,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { GlassdoorResult } from "../lib/glassdoorService";

interface GlassdoorReviewsCardProps {
  company: string;
  position: string;
  data: GlassdoorResult | null;
  loading: boolean;
  error?: string | null;
  fallbackSnippets?: string[];
  fallbackReviewLink?: string;
  onRetry?: () => void;
}

export const GlassdoorReviewsCard: React.FC<GlassdoorReviewsCardProps> = ({
  company,
  position,
  data,
  loading,
  error,
  fallbackSnippets = [],
  fallbackReviewLink,
  onRetry,
}) => {
  // Render star ratings helper
  const renderStars = (rating?: number) => {
    if (!rating) return null;
    const rounded = Math.round(rating);
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= rounded ? "fill-amber-400 text-amber-400" : "text-slate-200"
            }`}
          />
        ))}
        <span className="text-xs font-semibold text-slate-700 ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 px-5 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-base leading-tight">
              Employee Reviews & Workplace Ratings
            </h4>
            <p className="text-xs text-white/80 mt-0.5">
              Live feedback & workplace metrics for {company || "Company"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Scraping live...
            </span>
          ) : data ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              Verified Reviews
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Loading State */}
        {loading && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/70 rounded-lg border border-dashed border-slate-200">
            <div className="relative">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <Building2 className="w-4 h-4 text-emerald-700 absolute inset-0 m-auto" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Fetching employee reviews for {company}...
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Targeting role: <span className="font-medium text-slate-700">"{position}"</span>. If role-specific reviews aren't found, company-wide reviews will be retrieved.
              </p>
            </div>
          </div>
        )}

        {/* Loaded Glassdoor Data */}
        {!loading && data && (
          <>
            {/* Overview / Company Ratings Card */}
            {data.overview && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      {data.overview.companyName}
                      <span className="text-xs font-normal text-slate-500">
                        ({data.overview.reviewCount > 0 ? `${data.overview.reviewCount.toLocaleString()} reviews` : "Company Profile"})
                      </span>
                    </h5>
                    <div className="mt-1 flex items-center gap-2">
                      {renderStars(data.overview.overallRating)}
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs text-slate-600 font-medium">
                        Overall Score: {data.overview.overallRating.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>

                  {data.overview.glassdoorUrl && (
                    <a
                      href={data.overview.glassdoorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                    >
                      View Company Reviews
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Sub-ratings Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200">
                  {data.overview.workLifeBalanceRating && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">Work / Life Balance</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        ⭐ {data.overview.workLifeBalanceRating.toFixed(1)}{" "}
                        <span className="text-xs font-normal text-slate-400">/ 5</span>
                      </p>
                    </div>
                  )}

                  {data.overview.compensationRating && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">Compensation & Benefits</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        ⭐ {data.overview.compensationRating.toFixed(1)}{" "}
                        <span className="text-xs font-normal text-slate-400">/ 5</span>
                      </p>
                    </div>
                  )}

                  {data.overview.cultureRating && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">Culture & Values</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        ⭐ {data.overview.cultureRating.toFixed(1)}{" "}
                        <span className="text-xs font-normal text-slate-400">/ 5</span>
                      </p>
                    </div>
                  )}

                  {data.overview.careerOpportunitiesRating && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">Career Opportunities</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        ⭐ {data.overview.careerOpportunitiesRating.toFixed(1)}{" "}
                        <span className="text-xs font-normal text-slate-400">/ 5</span>
                      </p>
                    </div>
                  )}

                  {data.overview.seniorManagementRating && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">Senior Leadership</p>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        ⭐ {data.overview.seniorManagementRating.toFixed(1)}{" "}
                        <span className="text-xs font-normal text-slate-400">/ 5</span>
                      </p>
                    </div>
                  )}

                  {data.overview.recommendToFriendPercent && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">Recommend to Friend</p>
                      <p className="text-sm font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {data.overview.recommendToFriendPercent}%
                      </p>
                    </div>
                  )}

                  {data.overview.ceoApprovalPercent && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                      <p className="text-xs text-slate-500">
                        CEO Approval {data.overview.ceoName ? `(${data.overview.ceoName})` : ""}
                      </p>
                      <p className="text-sm font-semibold text-blue-600 mt-0.5 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        {data.overview.ceoApprovalPercent}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Target Role Status Banner */}
            <div>
              {data.hasRoleSpecificReviews ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">
                        Role-Specific Reviews for "{data.targetRole}"
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Showing employee feedback matching this job position
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                    {data.reviews.length} Role {data.reviews.length === 1 ? "Review" : "Reviews"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <div>
                      <p className="font-semibold text-xs sm:text-sm">
                        Company-Wide Employee Reviews
                      </p>
                      <p className="text-[11px] text-amber-700">
                        No specific review found matching "{position}". Showing general company reviews.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                    {data.reviews.length} General {data.reviews.length === 1 ? "Review" : "Reviews"}
                  </span>
                </div>
              )}
            </div>

            {/* Individual Reviews Cards */}
            {data.reviews.length > 0 ? (
              <div className="space-y-3.5">
                {data.reviews.map((review, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-sm space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {review.jobTitle}
                        </span>
                        {review.isRoleSpecific && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-md">
                            Role Match
                          </span>
                        )}
                      </div>
                      {renderStars(review.rating)}
                    </div>

                    {/* Pros */}
                    {review.pros && (
                      <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/70">
                        <div className="p-1 bg-emerald-100 text-emerald-700 rounded-md shrink-0 mt-0.5">
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-emerald-800">Pros: </span>
                          <span className="leading-relaxed">{review.pros}</span>
                        </div>
                      </div>
                    )}

                    {/* Cons */}
                    {review.cons && (
                      <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100/70">
                        <div className="p-1 bg-rose-100 text-rose-700 rounded-md shrink-0 mt-0.5">
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-semibold text-rose-800">Cons: </span>
                          <span className="leading-relaxed">{review.cons}</span>
                        </div>
                      </div>
                    )}

                    {/* Advice to Management */}
                    {review.adviceToManagement && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 italic">
                        <span className="font-semibold text-slate-700 not-italic">
                          Advice to Management:{" "}
                        </span>
                        "{review.adviceToManagement}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-2">
                No detailed review text returned for this company.
              </p>
            )}
          </>
        )}

        {/* Fallback to AI Insights if Apify returned no data or errored */}
        {!loading && !data && (
          <div className="space-y-3">
            {error && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Workplace review notice: {error}. Showing AI workplace analysis below.
              </div>
            )}

            {fallbackSnippets.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">
                  Work Culture & Sentiment Insights:
                </p>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  {fallbackSnippets.map((snippet, i) => (
                    <p key={i} className="text-xs italic text-slate-700 leading-relaxed">
                      "{snippet}"
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center py-2">
                No reviews available yet.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              {fallbackReviewLink && (
                <a
                  href={fallbackReviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Search Company Reviews <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-medium ml-auto"
                >
                  <RefreshCw className="w-3 h-3" /> Retry review fetch
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassdoorReviewsCard;
