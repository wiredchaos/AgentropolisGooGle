import { FeatureShowcase, type TabMedia } from "@/components/ui/feature-showcase";

export default function Page() {
  const tabs: TabMedia[] = [
    {
      value: "apparel",
      label: "Apparel",
      src: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&auto=format&fit=crop",
      alt: "Apparel mockup",
    },
    {
      value: "screen",
      label: "Screen",
      src: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=900&auto=format&fit=crop",
      alt: "Website template on screen",
    },
    {
      value: "abstract",
      label: "Abstract",
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop",
      alt: "Abstract background",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <FeatureShowcase
        eyebrow="Experience"
        title="Design that adapts to your vibe"
        description="Turn your ideas into visuals that match your style — whether it's product mockups, website screens, or abstract art. Instantly switch views and find what clicks with your brand."
        stats={["3 styles", "Instant preview", "Creative-ready"]}
        steps={[
          {
            id: "step-1",
            title: "Upload your concept",
            text: "Start with any visual — a logo, sketch, or product photo. We'll analyze it to set your creative tone.",
          },
          {
            id: "step-2",
            title: "Preview across styles",
            text: "Toggle between Apparel, Screen, and Abstract to visualize how your idea fits different mediums.",
          },
          {
            id: "step-3",
            title: "Refine and export",
            text: "Fine-tune the details, download polished assets, and share them directly with your team or clients.",
          },
        ]}
        tabs={tabs}
        defaultTab="screen"
        panelMinHeight={720}
      />
    </main>
  );
}
