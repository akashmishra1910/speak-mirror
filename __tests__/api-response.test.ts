import { successResponse, errorResponse } from "@/lib/api-response";

jest.mock("next/server", () => {
  return {
    NextResponse: {
      json: (body: any, init?: any) => {
        return {
          status: init?.status || 200,
          json: async () => body,
        };
      },
    },
  };
});

describe("API Response Utilities", () => {
  it("generates a successful standard envelope", async () => {
    const data = { token: "12345" };
    const res: any = successResponse(data, 201);
    
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
    expect(body.error).toBeUndefined();
  });

  it("generates an error standard envelope", async () => {
    const message = "Invalid email format";
    const res: any = errorResponse(message, 400);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe(message);
    expect(body.data).toBeUndefined();
  });
});
