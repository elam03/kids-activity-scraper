import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';

async function runTests() {
  console.log("Validating Middleware logic...");

  // Case 1: Unauthenticated user accessing /admin dashboard
  console.log("\n--- Case 1: Unauthenticated request to /admin ---");
  const req1 = new NextRequest(new Request("http://localhost/admin"), {});
  const res1 = middleware(req1);
  if (!res1 || res1.status !== 307 || !res1.headers.get('location')?.endsWith('/admin/login')) {
    throw new Error(`Case 1 Failed: Expected redirect to /admin/login, got ${res1?.status} with location ${res1?.headers.get('location')}`);
  }
  console.log("✅ Case 1 Passed: Request intercepted and redirected to /admin/login.");

  // Case 2: Authenticated user accessing /admin dashboard
  console.log("\n--- Case 2: Authenticated request to /admin ---");
  const req2 = new NextRequest(new Request("http://localhost/admin"), {
    headers: {
      cookie: "admin-session=authenticated"
    }
  });
  const res2 = middleware(req2);
  // Expected to pass through (returns a Response with status 200 or Next chain)
  if (res2 && res2.headers.get('location')?.endsWith('/admin/login')) {
    throw new Error("Case 2 Failed: Authenticated request was incorrectly blocked");
  }
  console.log("✅ Case 2 Passed: Authenticated request allowed.");

  // Case 3: Authenticated user trying to visit /admin/login page
  console.log("\n--- Case 3: Authenticated request to /admin/login ---");
  const req3 = new NextRequest(new Request("http://localhost/admin/login"), {
    headers: {
      cookie: "admin-session=authenticated"
    }
  });
  const res3 = middleware(req3);
  if (!res3 || res3.status !== 307 || !res3.headers.get('location')?.endsWith('/admin')) {
    throw new Error(`Case 3 Failed: Expected redirect to /admin dashboard, got ${res3?.status}`);
  }
  console.log("✅ Case 3 Passed: Authenticated user redirected from login page to dashboard.");

  console.log("\n✅ All Auth Middleware Integration Tests Passed!");
}

runTests().catch(err => {
  console.error("❌ Test Suite Failed:", err);
  process.exit(1);
});
