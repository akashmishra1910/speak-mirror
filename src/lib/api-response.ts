import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

export function successResponse<T = any>(data: T, status = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return NextResponse.json(response, { status });
}

export function errorResponse(message: string, status = 400) {
  const response: ApiResponse = {
    success: false,
    error: message,
  };
  return NextResponse.json(response, { status });
}
