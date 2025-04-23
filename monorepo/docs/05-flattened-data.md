# Flattened Data Structures

This document describes the principle of using flattened (or normalized) data structures throughout the application stack, from database query results and API responses to frontend state management.

## The Problem: Nested Data

It's often tempting to represent related data using nested objects. For example, an API endpoint fetching a blog post might return:

```json
// BAD: Nested API Response
{
  "id": "post123",
  "title": "My Great Post",
  "content": "...",
  "author": {
    "id": "user456",
    "name": "Alice",
    "email": "alice@example.com"
  },
  "comments": [
    {
      "id": "comment789",
      "text": "Great read!",
      "author": {
        "id": "user987",
        "name": "Bob",
        "email": "bob@example.com"
      }
    }
    // ... other comments with nested authors ...
  ]
}
```

While seemingly convenient initially, this leads to several problems:

1.  **Data Duplication:** The same author information (e.g., Bob's details) might be repeated across multiple comments or even different posts if fetched similarly.
2.  **Synchronization Issues:** If Bob updates his name, where do you update it? In every comment object he authored across potentially many cached posts? This becomes a nightmare to keep consistent.
3.  **Cache Invalidation Complexity:** Updating a single user record requires potentially invalidating and refetching many different posts or comments where that user's data was nested.
4.  **Over-fetching:** The client might only need the post title and author ID, but receives the full nested author object and all comments.
5.  **Inconsistent Shapes:** Different endpoints might nest the same data differently, leading to unpredictable response structures.

## The Solution: Flattened Data and References (Normalization)

Inspired by relational database normalization, the principle is to treat each type of entity (users, posts, comments) as a distinct resource identified by a unique ID. Relationships are represented by storing the ID of the related entity, not the entire entity itself.

**Database Layer:**

- Query functions should return flat records. Use joins primarily to filter or retrieve foreign keys, not to create nested result objects. (See [Handling Joins](mdc:../../saflib/drizzle-sqlite3/docs/03-queries.md#handling-joins)).

**API Layer:**

- API responses should consist of flat lists or objects representing the primary resource(s) requested.
- Relationships should be represented by including the ID of the related resource(s).
- While separate endpoints to fetch related resources by ID are essential, API endpoints **can** return related data in a single response to optimize for common use cases and reduce round trips.
- When including related data, it **must** be returned in a structured, normalized way within the response object. Group related entities by type under top-level keys.

```json
// GOOD: Flattened API Response with Included Related Entities
// Example: GET /posts/post123?include=author,comments
// The single response object contains separate arrays for each entity type requested.
{
  "posts": [
    {
      "id": "post123",
      "title": "My Great Post",
      "content": "...",
      "authorId": "user456",
      "commentIds": ["comment789", "commentABC"]
    }
  ],
  "users": [
    {
      "id": "user456",
      "name": "Alice",
      "email": "alice@example.com"
    },
    {
      "id": "user987",
      "name": "Bob",
      "email": "bob@example.com"
    }
  ],
  "comments": [
    {
      "id": "comment789",
      "text": "Great read!",
      "authorId": "user987",
      "postId": "post123"
    },
    {
      "id": "commentABC",
      "text": "I agree!",
      "authorId": "user456",
      "postId": "post123"
    }
  ]
}
```

**Frontend Layer (e.g., using TanStack Query):**

- Store data in normalized caches, keyed by resource type and ID (e.g., `['users', userId]`, `['posts', postId]`).
- A single API response, structured as above, can populate or update _multiple_ cache entries simultaneously (e.g., the `posts` array updates post entries, the `users` array updates user entries).
- When displaying related data (e.g., showing author name on a post), use the `authorId` from the post data to query the user cache (`useQuery(['users', post.authorId])`). TanStack Query will often resolve this instantly if the user data was included in the initial response and is already in the cache.
- Mutations (updates) only need to invalidate the specific cache entry for the updated resource (e.g., updating user 'user456' only invalidates `['users', 'user456']`). Components displaying data derived from this cache entry will automatically refetch and update.

## Benefits

- **Single Source of Truth:** Each piece of data exists in one place (the normalized cache entry or DB table).
- **Easy Updates:** Updating a resource (e.g., user name) happens in one place.
- **Simplified Caching:** Cache invalidation is straightforward and targeted.
- **Reduced Bandwidth:** APIs send less redundant data.
- **Predictable Structures:** API responses and cache structures are consistent.
- **Scalability:** Easier to manage complex data relationships as the application grows.

Adopting flattened data structures requires a shift in thinking away from nesting but leads to significantly more maintainable, scalable, and performant applications, especially when dealing with complex related data and client-side caching.
