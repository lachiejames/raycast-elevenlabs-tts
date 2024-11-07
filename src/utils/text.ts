import { getSelectedText } from "@raycast/api";

/**
 * Creates a preview of the text content
 * Trims whitespace and truncates long text for display
 *
 * @param text - Full text content
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Trimmed and potentially truncated text
 */
export function getTextPreview(text: string, maxLength = 50): string {
  // Remove any leading/trailing whitespace before processing
  const trimmedText = text.trim();

  // If text is longer than maxLength, truncate and add ellipsis
  // Otherwise return the full trimmed text
  return trimmedText.length > maxLength ? `${trimmedText.substring(0, maxLength)}...` : trimmedText;
}

/**
 * Calculates statistics about the text content
 * Used for progress feedback in UI
 *
 * @param text - Text content to analyze
 * @returns Object containing word and character counts
 */
export function getTextStats(text: string) {
  // Split text on any whitespace characters to count words
  // This handles multiple spaces, tabs, and newlines
  const wordCount = text.trim().split(/\s+/).length;

  // Simple character count including spaces and punctuation
  const charCount = text.length;

  return { wordCount, charCount };
}

/**
 * Validates that text is selected in the active application
 * Provides user-friendly error messages for common issues
 *
 * @returns Selected text if available
 * @throws {Error} with guidance if no text is selected
 */
export async function validateSelectedText(): Promise<string> {
  try {
    // Attempt to get text selection from the active application
    // This will throw if no text is selected or if we can't access the selection
    const selectedText = await getSelectedText();

    // Check for empty or whitespace-only selection
    // This catches cases where text is selected but is just spaces/tabs/newlines
    if (!selectedText || selectedText.trim().length === 0) {
      throw new Error("No text selected - Select text and try again (⌥ D)");
    }

    return selectedText;
  } catch (error) {
    // Special handling for Raycast's "Unable to get selected text" error
    // This occurs when no text is actually selected in any application
    if (error instanceof Error && error.message.includes("Unable to get selected text")) {
      throw new Error("Select text in any application before running this command (⌥ D)");
    }
    throw error;
  }
} 