# Store Average Ratings Feature

## Overview

This feature adds automatic calculation and storage of average star ratings for each store (business) based on the reviews (comments with ratings) posted on their videos.

## Database Schema Changes

### New Columns Added to `businesses` Table

```sql
average_rating DECIMAL(3, 2) DEFAULT NULL
total_reviews INTEGER DEFAULT 0
```

- **average_rating**: The average rating out of 5.00, with 2 decimal places (e.g., 4.75)
- **total_reviews**: The total number of reviews/comments with ratings for this business

## Database Functions

### 1. `get_business_average_rating(business_id UUID)`

Calculates the average rating for a specific business.

**Parameters:**
- `p_business_id`: UUID of the business

**Returns a table with:**
- `business_id`: The business ID
- `average_rating`: Average rating out of 5.00
- `total_reviews`: Total number of reviews

**Example:**
```sql
SELECT * FROM public.get_business_average_rating('550e8400-e29b-41d4-a716-446655440000');
```

### 2. `get_all_business_ratings()`

Gets average ratings for all businesses that have reviews.

**Returns a table with:**
- `business_id`: The business ID
- `average_rating`: Average rating out of 5.00
- `total_reviews`: Total number of reviews

**Example:**
```sql
SELECT * FROM public.get_all_business_ratings();
```

### 3. `update_business_ratings()`

Manually recalculates and updates all business ratings. This can be useful if you need to recalculate ratings outside of the automatic trigger.

**Example:**
```sql
CALL public.update_business_ratings();
```

## Automatic Updates

A trigger (`update_business_ratings_on_comment`) is automatically executed whenever:
- A new comment with a rating is added
- A comment rating is updated

The trigger automatically updates the `average_rating` and `total_reviews` columns for the associated business.

## Backend API - TypeScript/Services

### ProfileService Methods

#### 1. `getBusinessesWithRatings()`

Fetches all businesses with their latest average ratings.

```typescript
import { profileService } from '@/services/ProfileService';

const { data: businesses, error } = await profileService.getBusinessesWithRatings();
// Returns array of businesses sorted by highest average_rating first
```

**Response fields:**
- `id`: Business UUID
- `business_name`: Name of the business
- `category`: Business category
- `average_rating`: Average rating out of 5.00
- `total_reviews`: Number of reviews
- `profile_picture_url`: Business logo/photo URL
- `latitude`, `longitude`: Location coordinates
- `owner_id`: User ID of business owner

#### 2. `getBusinessWithRatings(businessId: string)`

Gets a specific business with its rating details.

```typescript
const { data: business, error } = await profileService.getBusinessWithRatings(businessId);
```

**Response includes:**
- All fields from above plus:
- `business_hours`: Business operating hours (JSON)
- `business_type`: Type of business
- `description`: Business description

#### 3. `getBusinessAverageRating(businessId: string)`

Gets just the average rating data for a business.

```typescript
const { data: ratingData, error } = await profileService.getBusinessAverageRating(businessId);
// { business_id, average_rating, total_reviews }
```

#### 4. `getAllBusinessAverageRatings()`

Gets average ratings for all businesses (using RPC function).

```typescript
const { data: ratings, error } = await profileService.getAllBusinessAverageRatings();
// Returns array of { business_id, average_rating, total_reviews }
```

#### 5. `updateAllBusinessRatings()`

Manually triggers a recalculation of all business ratings.

```typescript
const { data, error } = await profileService.updateAllBusinessRatings();
```

## Frontend Usage Example

### Displaying Store Ratings

```typescript
import { profileService } from '@/services/ProfileService';

export async function getStoresWithRatings() {
  const { data: businesses } = await profileService.getBusinessesWithRatings();
  
  return businesses.map(business => ({
    id: business.id,
    name: business.business_name,
    rating: business.average_rating,
    reviewCount: business.total_reviews,
    image: business.profile_picture_url,
  }));
}
```

### Displaying Single Store Rating

```typescript
export async function getStoreDetails(businessId: string) {
  const { data: business } = await profileService.getBusinessWithRatings(businessId);
  
  if (!business) return null;
  
  return {
    name: business.business_name,
    category: business.category,
    averageRating: business.average_rating || 'No ratings yet',
    reviewCount: business.total_reviews,
    hours: business.business_hours,
    description: business.description,
  };
}
```

### Rating Stars Component

```typescript
export function RatingStars({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) {
    return <div>No ratings yet ({count} reviews)</div>;
  }
  
  const stars = Math.round(rating);
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{'⭐'.repeat(stars)}</span>
      <span className="font-semibold">{rating.toFixed(2)}</span>
      <span className="text-gray-600">({count} reviews)</span>
    </div>
  );
}
```

## Data Flow

```
User Posts Comment with Rating
                ↓
Comment Inserted into comments table
                ↓
Trigger fires: update_business_ratings_on_comment
                ↓
Function: handle_comment_rating_update()
                ↓
Calculates AVG(rating) for all comments on videos
belonging to that business
                ↓
Updates businesses.average_rating
Updates businesses.total_reviews
Updates businesses.updated_at
                ↓
Rating is now available in getBusinessWithRatings()
and other queries
```

## Notes

- Ratings are only calculated from comments that have a non-NULL `rating` value
- Comments without ratings are excluded from the average calculation
- The average is rounded to 2 decimal places (e.g., 4.75)
- If a business has no comments with ratings, `average_rating` will be NULL and `total_reviews` will be 0
- The `updated_at` timestamp on the business record is automatically updated whenever ratings change
- All functions run with `SECURITY DEFINER` to ensure proper permissions

## Migration

Run the migration `037_fix_comment_functions.sql` to implement this feature:

```bash
# In your Supabase dashboard or via CLI
supabase migration up 037_fix_comment_functions.sql
```
