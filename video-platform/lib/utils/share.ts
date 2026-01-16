/**
 * Share utility for posts with Web Share API and clipboard fallback
 */

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export interface ShareResult {
  success: boolean;
  usedWebShare: boolean;
  error?: string;
}

/**
 * Share a post using native Web Share API when available,
 * otherwise copy to clipboard as fallback
 */
export async function sharePost(data: ShareData): Promise<ShareResult> {
  // Check if Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share(data);
      return { success: true, usedWebShare: true };
    } catch (error) {
      // User cancelled share or error occurred
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, usedWebShare: true, error: 'Share cancelled' };
      }
      // Fall through to clipboard fallback
      console.warn('Web Share API failed, falling back to clipboard:', error);
    }
  }

  // Fallback: copy to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(data.url);
      return { success: true, usedWebShare: false };
    } else {
      // Legacy fallback for browsers without clipboard API
      // Note: execCommand is deprecated but provides compatibility for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = data.url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return { success: true, usedWebShare: false };
      } else {
        return { success: false, usedWebShare: false, error: 'Copy failed' };
      }
    }
  } catch (error) {
    return { 
      success: false, 
      usedWebShare: false, 
      error: error instanceof Error ? error.message : 'Clipboard access denied'
    };
  }
}
