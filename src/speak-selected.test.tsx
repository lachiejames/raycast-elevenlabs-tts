import { getTextPreview, getTextStats, prepareVoiceSettings } from "./speak-selected";

describe("Text Processing Functions", () => {
  describe("getTextPreview", () => {
    it("should return full text when under max length", () => {
      const text = "Hello world";
      expect(getTextPreview(text)).toBe("Hello world");
    });

    it("should truncate text when over max length", () => {
      const longText = "This is a very long text that should be truncated at some point";
      expect(getTextPreview(longText, 20)).toBe("This is a very long ...");
    });

    it("should handle empty strings", () => {
      expect(getTextPreview("")).toBe("");
    });

    it("should trim whitespace", () => {
      expect(getTextPreview("  Hello world  ")).toBe("Hello world");
    });
  });

  describe("getTextStats", () => {
    it("should count words correctly", () => {
      expect(getTextStats("Hello world").wordCount).toBe(2);
    });

    it("should handle multiple spaces between words", () => {
      expect(getTextStats("Hello   world").wordCount).toBe(2);
    });

    it("should count characters correctly", () => {
      expect(getTextStats("Hello world").charCount).toBe(11);
    });

    it("should handle empty strings", () => {
      const stats = getTextStats("");
      expect(stats.wordCount).toBe(0);
      expect(stats.charCount).toBe(0);
    });

    it("should handle strings with only whitespace", () => {
      const stats = getTextStats("   ");
      expect(stats.wordCount).toBe(0);
      expect(stats.charCount).toBe(3);
    });
  });

  describe("prepareVoiceSettings", () => {
    it("should handle valid preference values", () => {
      const prefs = {
        stability: "0.7",
        similarityBoost: "0.8",
        elevenLabsApiKey: "dummy",
        voiceId: "dummy",
      };

      const settings = prepareVoiceSettings(prefs);
      expect(settings.stability).toBe(0.7);
      expect(settings.similarity_boost).toBe(0.8);
    });

    it("should clamp values above 1", () => {
      const prefs = {
        stability: "1.5",
        similarityBoost: "2.0",
        elevenLabsApiKey: "dummy",
        voiceId: "dummy",
      };

      const settings = prepareVoiceSettings(prefs);
      expect(settings.stability).toBe(1.0);
      expect(settings.similarity_boost).toBe(1.0);
    });

    it("should clamp values below 0", () => {
      const prefs = {
        stability: "-0.5",
        similarityBoost: "-1.0",
        elevenLabsApiKey: "dummy",
        voiceId: "dummy",
      };

      const settings = prepareVoiceSettings(prefs);
      expect(settings.stability).toBe(0.0);
      expect(settings.similarity_boost).toBe(0.0);
    });

    it("should handle invalid number strings", () => {
      const prefs = {
        stability: "invalid",
        similarityBoost: "not a number",
        elevenLabsApiKey: "dummy",
        voiceId: "dummy",
      };

      const settings = prepareVoiceSettings(prefs);
      expect(settings.stability).toBe(0.5); // default value
      expect(settings.similarity_boost).toBe(0.75); // default value
    });
  });
});
