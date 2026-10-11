import Hero from "../components/Hero/Hero";
import About from "../components/About/About";
import Properties from "../components/Properties/Properties";
import FAQ from "../components/FAQ/FAQ";
import CTA from "../components/CTA/CTA";
import Contact from "../components/Contact/Contact";
import Testimonials from "../components/Testimonials/Testimonials";
import PublicUpdates from "./PublicUpdates";
import Footer from "../components/Footer/Footer";


const Home = () => {
  return (
    <>
      <Hero />
      <PublicUpdates />
      <About />
      <Properties />
      <Testimonials />
      <FAQ />
      <CTA />
      <Contact />
      <Footer />
    </>
  );
};

export default Home;