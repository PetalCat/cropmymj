# Prisma Migration Complete

## Summary

Successfully migrated from `better-sqlite3` to Prisma ORM for cleaner, type-safe database operations.

## What Changed

### Database Layer
- **Before**: Direct SQL with `better-sqlite3` and prepared statements
- **After**: Prisma ORM with type-safe queries and automatic migrations

### Schema Definition
- Created `prisma/schema.prisma` with 4 models:
  - `Image` - Stores image metadata
  - `Crop` - Stores user crop submissions
  - `Orientation` - Stores user orientation classifications
  - `Unfit` - Stores unfit image markings

### Field Naming
- Using **snake_case** for database columns and TypeScript fields
- Fields: `image_id`, `user_id`, `created_at`
- Consistent naming eliminates @map directives

### Migrated Endpoints

#### Core API Routes (Session-protected)
- ✅ `/api/submit` - Submit crop and orientation data
- ✅ `/api/unfit` - Mark image as unfit
- ✅ `/api/user-progress` - Get user progress
- ✅ `/api/consensus` - Get consensus crop/orientation

#### V1 API Routes (Token-protected)
- ✅ `/api/v1/images/upload` - Upload images with data
- ✅ `/api/v1/images/list` - List all images
- ✅ `/api/v1/images/data` - Get image data
- ✅ `/api/v1/images/bulk` - Get bulk image data
- ✅ `/api/v1/images/download/[filename]` - Download images (no DB changes)

## Usage

### Development
```bash
# Generate Prisma client after schema changes
pnpm prisma generate

# Push schema changes to database
pnpm prisma db push

# Open Prisma Studio (DB GUI)
pnpm prisma studio
```

### Example Query Patterns

**Before (better-sqlite3)**:
```typescript
const stmt = db.prepare('INSERT INTO crops (image_id, user_id, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)');
stmt.run(imageId, userId, x, y, width, height);
```

**After (Prisma)**:
```typescript
await prisma.crop.create({
  data: {
    image_id: imageId,
    user_id: userId,
    x,
    y,
    width,
    height
  }
});
```

**Transactions**:
```typescript
await prisma.$transaction([
  prisma.crop.create({ data: { ... } }),
  prisma.orientation.create({ data: { ... } })
]);
```

**Relations**:
```typescript
const image = await prisma.image.findUnique({
  where: { filename: 'test.jpg' },
  include: {
    crops: true,
    orientations: true,
    unfits: true
  }
});
```

## Benefits

1. **Type Safety**: Full TypeScript support with auto-generated types
2. **Better DX**: Autocomplete, type checking, refactoring support
3. **Migrations**: Track schema changes over time (when using `prisma migrate dev`)
4. **Relations**: Easy to query related data
5. **Validation**: Built-in validation and error handling
6. **No SQL**: Write queries in TypeScript
7. **Testing**: Easier to mock and test

## Database File

Location: `./data/crops.db` (SQLite)

Configure via `.env`:
```env
DATABASE_URL="file:./data/crops.db"
```

## Build Process

The Prisma client is automatically generated during build:
```json
"scripts": {
  "build": "prisma generate && vite build"
}
```

## Migration History

Currently using `db push` for development. For production:

```bash
# Create migration
pnpm prisma migrate dev --name description_of_change

# Apply migrations in production
pnpm prisma migrate deploy
```

## Rollback Plan

If needed, revert to better-sqlite3:
1. Restore `src/lib/server/db.ts` from git history
2. Restore old API endpoint files
3. Remove `prisma/` directory
4. Uninstall Prisma: `pnpm remove prisma @prisma/client`
5. Reinstall better-sqlite3: `pnpm add better-sqlite3`

## Status

✅ All endpoints migrated
✅ Type checking passes (0 errors)
✅ Build succeeds
✅ Authentication system working
⚠️ Consider creating formal migrations for production deployment
