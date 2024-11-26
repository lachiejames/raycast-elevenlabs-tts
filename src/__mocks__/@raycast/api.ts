/**
 * Mocked functions for @raycast/api
 * Required for testing without actually using the Raycast API
 */
export const getSelectedText = jest.fn();
export const showToast = jest.fn();
export const getPreferenceValues = jest.fn();
export const Toast = {
  Style: {
    Animated: "Animated",
    Success: "Success",
    Failure: "Failure",
  },
};
