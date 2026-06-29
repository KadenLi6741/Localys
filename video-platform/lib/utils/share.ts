/**
 * share.ts — share a post/video link with graceful fallbacks.
 * Purpose: Uses the native Web Share sheet on supported (mostly mobile) devices, and otherwise copies
 *   the link to the clipboard — with a hidden-textarea fallback for older browsers. Returns a result so
 *   callers can show the right feedback (e.g. "Link copied").
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
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
  if (navigator.share) {
    try {
      await navigator.share(data);
      return { success: true, usedWebShare: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, usedWebShare: true, error: 'Share cancelled' };
      }
      console.warn('Web Share API failed, falling back to clipboard:', error);
    }
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(data.url);
      return { success: true, usedWebShare: false };
    } else {
      // Legacy fallback for browsers without the async Clipboard API: copy via a hidden, off-screen
      // textarea and execCommand('copy').
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
