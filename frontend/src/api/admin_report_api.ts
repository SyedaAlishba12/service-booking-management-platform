import { apiClient } from "@/utils/api_client";
import type { ApiResponse } from "@/types/api";
import type {
  DashboardStatsData,
  ReportQueryParams,
  UserReportData,
  ProviderReportData,
  ServiceReportData,
  BookingReportData,
  RevenueReportData,
  ReviewReportData,
  ComplaintReportData
} from "@/types/admin_report";

export const adminReportApi = {
  getDashboardStats(): Promise<ApiResponse<DashboardStatsData>> {
    return apiClient.get<ApiResponse<DashboardStatsData>>(`/api/admin/dashboard/stats`);
  },

  getReport<T>(kind: string, params: ReportQueryParams): Promise<ApiResponse<T>> {
    const query = new URLSearchParams();
    if (params.date_from) query.append("date_from", params.date_from);
    if (params.date_to) query.append("date_to", params.date_to);
    
    const queryString = query.toString();
    const url = `/api/admin/reports/${kind}${queryString ? `?${queryString}` : ""}`;
    return apiClient.get<ApiResponse<T>>(url);
  },
  
  getUsersReport(params: ReportQueryParams) {
    return this.getReport<UserReportData>("users", params);
  },
  
  getProvidersReport(params: ReportQueryParams) {
    return this.getReport<ProviderReportData>("providers", params);
  },
  
  getServicesReport(params: ReportQueryParams) {
    return this.getReport<ServiceReportData>("services", params);
  },
  
  getBookingsReport(params: ReportQueryParams) {
    return this.getReport<BookingReportData>("bookings", params);
  },
  
  getRevenueReport(params: ReportQueryParams) {
    return this.getReport<RevenueReportData>("revenue", params);
  },
  
  getReviewsReport(params: ReportQueryParams) {
    return this.getReport<ReviewReportData>("reviews", params);
  },
  
  getComplaintsReport(params: ReportQueryParams) {
    return this.getReport<ComplaintReportData>("complaints", params);
  }
};
