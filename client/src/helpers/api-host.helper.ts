export const apiHost = process.env.NODE_ENV === "production" ? "" : "http://localhost:3000";
export const apiUrl = (path: string) => `${apiHost}/api/${path.trim().replace(/^\//, "")}`;
