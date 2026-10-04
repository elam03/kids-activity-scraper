import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';

test('Prisma schema exports User and Bookmark model delegates and types', () => {
  // Check that Prisma.ModelName contains User and Bookmark
  assert.ok(Prisma.ModelName.User, 'Prisma.ModelName should include User');
  assert.ok(Prisma.ModelName.Bookmark, 'Prisma.ModelName should include Bookmark');

  // Verify Prisma ScalarFieldEnums
  assert.ok(Prisma.UserScalarFieldEnum.email, 'User should have email field');
  assert.ok(Prisma.UserScalarFieldEnum.googleId, 'User should have googleId field');
  assert.ok(Prisma.UserScalarFieldEnum.role, 'User should have role field');

  assert.ok(Prisma.BookmarkScalarFieldEnum.userId, 'Bookmark should have userId field');
  assert.ok(Prisma.BookmarkScalarFieldEnum.eventId, 'Bookmark should have eventId field');
});
