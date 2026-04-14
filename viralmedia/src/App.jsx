import "./index.css";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import SelectedWork from "./components/SelectedWork";
import VideoShowcase from "./components/VideoShowcase";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <About />
      <SelectedWork />
      <VideoShowcase />
      <CTA />
      <Footer />
    </div>
  );
}
