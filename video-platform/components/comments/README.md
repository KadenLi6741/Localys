# Video Comments, Likes, and Replies System

A complete, production-ready commenting system for videos built with Supabase, featuring real-time updates, likes, and threaded replies.

## Features

✅ **Video Comments** - Comment on any video
✅ **Threaded Replies** - 1-level nested replies
✅ **Like System** - Like/unlike comments with live counts
✅ **Real-time Updates** - Instant updates using Supabase Realtime
✅ **Row Level Security** - Secure access control with RLS
✅ **Pagination** - Efficient loading of large comment threads
✅ **TypeScript Support** - Full type safety throughout
✅ **Production Ready** - Error handling, optimistic updates, and best practices

## Database Schema

### Tables

1. **comments** - Comments and replies on videos
2. **comment_likes** - User likes on comments

### Key Design Decisions

- **Threaded Replies**: Uses `parent_comment_id` for 1-level nesting (prevents reply chains)
- **Like Counts**: Stored efficiently with database functions
- **UUIDs**: All IDs use UUIDs for security and distributed systems
- **Real-time Ready**: All tables enabled for Supabase Realtime

## Setup Instructions

### 1. Run SQL Migrations

Execute the SQL files in your Supabase SQL editor:

1. **Schema Migration** (`supabase/migrations/004_video_comments_schema.sql`)
   - Creates tables, indexes, functions, and triggers
   - Run this first

2. **RLS Policies** (`supabase/migrations/005_video_comments_rls.sql`)
   - Enables Row Level Security
   - Creates security policies
   - Enables realtime subscriptions
   - Run after schema migration

### 2. Enable Realtime

Ensure Realtime is enabled in your Supabase dashboard for:
- `comments` table
- `comment_likes` table

## Usage Examples

### Basic Comment Section

```tsx
import { CommentSection } from '@/components/comments';

function VideoPage({ videoId }) {
  return (
    <div>
      {/* Your video player */}
      <video src={videoUrl} controls />

      {/* Comments section */}
      <CommentSection videoId={videoId} className="mt-8" />
    </div>
  );
}
```

### Manual Comment Management

```tsx
import {
  getVideoComments,
  createComment,
  likeComment,
  subscribeToVideoComments,
} from '@/components/comments';

// Load comments
const { data: comments, error } = await getVideoComments(videoId, 20, 0);

// Create a comment
const { data: newComment, error } = await createComment({
  video_id: videoId,
  content: 'Great video!',
});

// Like a comment
await likeComment(commentId);

// Subscribe to real-time updates
const channel = subscribeToVideoComments(videoId, (newComment) => {
  console.log('New comment:', newComment);
  // Update your UI
});

// Cleanup
channel.unsubscribe();
```

## Component API

### CommentSection

Main component that displays all comments for a video.

```tsx
<CommentSection
  videoId="video-uuid"
  className="custom-styles"
/>
```

**Props:**
- `videoId` (string, required): The UUID of the video
- `className` (string, optional): Additional CSS classes

### CommentItem

Displays a single comment with replies and actions.

```tsx
<CommentItem
  comment={comment}
  videoId="video-uuid"
  onLikeUpdate={handleLikeUpdate}
  isReply={false}
/>
```

### CommentForm

Form for creating comments and replies.

```tsx
<CommentForm
  onSubmit={handleSubmit}
  loading={false}
  placeholder="Write a comment..."
  compact={false}
/>
```

## Security Features

### Row Level Security Policies

- **Comments**: Anyone can read, authenticated users can create/update/delete their own
- **Likes**: Anyone can read, authenticated users can manage their own likes
- **Unique Likes**: Database constraints prevent duplicate likes per user per comment

### Authentication Required

All write operations require an authenticated user. The system uses `auth.uid()` for verification.

## Real-time Features

### Subscriptions

- **New Comments**: Subscribe to new comments on a video
- **New Replies**: Subscribe to replies on specific comments
- **Like Updates**: Subscribe to like count changes across all comments

### Optimistic Updates

The UI updates immediately when users like comments or post content, providing instant feedback.

## Performance Optimizations

- **Pagination**: Comments load in pages of 20
- **Efficient Queries**: Database functions pre-compute like counts and user data
- **Indexes**: Optimized for fast comment fetching and searching
- **Real-time Filtering**: Only relevant updates are sent to clients

## Best Practices

1. **Always handle errors** - All functions return `{ data, error }` objects
2. **Clean up subscriptions** - Unsubscribe from real-time channels when components unmount
3. **Use optimistic updates** - Update UI immediately, then sync with server
4. **Paginate large threads** - Load comments in chunks for better performance
5. **Validate content** - Check comment length and content on both client and server

## Database Functions

### `get_video_comments(video_id, user_id, limit, offset)`

Returns comments for a video with like counts and user like status.

### `get_comment_replies(parent_comment_id, user_id, limit, offset)`

Returns replies for a specific comment.

### `get_comment_with_likes(comment_id, user_id)`

Returns a single comment with like data.

## Troubleshooting

### Comments not appearing in real-time

1. Check Realtime is enabled for `comments` table
2. Verify RLS policies allow reading comments
3. Ensure subscription is properly set up

### Like counts not updating

1. Check Realtime is enabled for `comment_likes` table
2. Verify the like subscription is active
3. Check for RLS policy issues

### "Unauthorized" errors

1. Verify user is authenticated
2. Check RLS policies are correctly configured
3. Ensure user owns the content they're trying to modify

## Future Enhancements

- Comment editing and deletion
- Nested replies (multiple levels)
- Comment sorting options (newest, most liked)
- Mention system (@username)
- Rich text comments (markdown, links)
- Comment moderation tools
- Push notifications for replies

## License

This code is provided as-is for use in your projects.