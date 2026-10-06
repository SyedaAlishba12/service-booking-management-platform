import DashboardPreview from "@/components/landing/DashboardPreview";
import FAQSection from "@/components/landing/FAQSection";
import FeaturedProviders from "@/components/landing/FeaturedProviders";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import LandingCTA from "@/components/landing/LandingCTA";
import ReviewsSection from "@/components/landing/ReviewsSection";
import ServiceCategories from "@/components/landing/ServiceCategories";
import ServicesSection from "@/components/landing/ServicesSection";
import MainLayout from "@/components/layout/MainLayout";

export default function LandingPage() {
  return (
    <MainLayout>
      <HeroSection />

      <ServicesSection />

      <ServiceCategories />

      <HowItWorks />

      <FeaturedProviders />

      <ReviewsSection />

      <DashboardPreview />

      <LandingCTA />

      <FAQSection />
    </MainLayout>
  );
}