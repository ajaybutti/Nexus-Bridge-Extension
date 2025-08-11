export function createResponse(data: any) {
  const staticResponseBody = new Blob([JSON.stringify(data)], {
    type: "application/json",
  });

  // Create a new response with the same headers and status as the original response, but with the static body
  return new Response(staticResponseBody, {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "application/json",
    },
  });
}
