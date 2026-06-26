/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as assignments from "../assignments.js";
import type * as audit from "../audit.js";
import type * as booklets from "../booklets.js";
import type * as classInvites from "../classInvites.js";
import type * as classes from "../classes.js";
import type * as dashboard from "../dashboard.js";
import type * as demoData from "../demoData.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as library from "../library.js";
import type * as marking from "../marking.js";
import type * as parentPortal from "../parentPortal.js";
import type * as practice from "../practice.js";
import type * as questions from "../questions.js";
import type * as resources from "../resources.js";
import type * as revisionLists from "../revisionLists.js";
import type * as savedQuestions from "../savedQuestions.js";
import type * as students from "../students.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  assignments: typeof assignments;
  audit: typeof audit;
  booklets: typeof booklets;
  classInvites: typeof classInvites;
  classes: typeof classes;
  dashboard: typeof dashboard;
  demoData: typeof demoData;
  feedback: typeof feedback;
  files: typeof files;
  library: typeof library;
  marking: typeof marking;
  parentPortal: typeof parentPortal;
  practice: typeof practice;
  questions: typeof questions;
  resources: typeof resources;
  revisionLists: typeof revisionLists;
  savedQuestions: typeof savedQuestions;
  students: typeof students;
  submissions: typeof submissions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
