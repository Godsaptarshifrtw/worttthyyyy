import Header from "../components/Header";
import Hero from "../components/Hero";
import FeatureShowcase from "../components/FeatureShowcase";
import Timeline from "../components/Timeline";
import JobSeekerSection from "../components/JobSeekerSection";
import CompanySection from "../components/CompanySection";
import AtsOptimizerSection from "../components/AtsOptimizerSection";
import Pricing from "../components/Pricing";
import Newsletter from "../components/Newsletter";
import FAQ from "../components/FAQ";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Header />
      <main>
        <Hero />
        <FeatureShowcase />
        <Timeline />

        {/* ATS Resume Optimizer for Job Seekers */}
        <section id="ats-optimizer" className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider mb-3">
              <span>New Feature for Job Seekers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              AI-Powered ATS Resume Optimizer
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Upload or paste your resume and target Job Description. Get an instant ATS compatibility score, uncover missing keywords, and generate enhanced experience bullets.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <AtsOptimizerSection />
          </div>
        </section>

        {/* Try Out Other Features */}
        <div className="container mx-auto px-4 py-16 md:py-24 border-t border-slate-200">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Job Offer & Candidate Evaluator
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Evaluate whether a job offer matches market compensation or quickly assess candidate fit.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <JobSeekerSection />
            <CompanySection />
          </div>
        </div>

        <Pricing />
        <FAQ />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
