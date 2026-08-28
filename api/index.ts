import { createApiApp } from "../server/app";

// Vercel invokes this exported Express application for every rewritten /api/*
// request. Do not call app.listen() in a serverless function.
export default createApiApp();
