import api from './api';
import {
  TimeRangeType,
  GovernanceOverviewAnalyticsDTO,
  SafetyAnalyticsDTO,
  ComplianceAnalyticsDTO,
  ProductionAnalyticsDTO,
  WorkforceAnalyticsDTO,
  EnvironmentalAnalyticsDTO,
  ContractorAnalyticsDTO,
  GrievanceAnalyticsDTO,
  FieldOperationsAnalyticsDTO,
  PredictiveRiskAnalyticsDTO,
  CrossMineBenchmarkingDTO
} from '../types/analytics';

export const analyticsService = {
  getOverview: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<GovernanceOverviewAnalyticsDTO> => {
    const res = await api.get<GovernanceOverviewAnalyticsDTO>(`/analytics/mines/${mineId}/overview`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getSafety: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<SafetyAnalyticsDTO> => {
    const res = await api.get<SafetyAnalyticsDTO>(`/analytics/mines/${mineId}/safety`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getCompliance: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<ComplianceAnalyticsDTO> => {
    const res = await api.get<ComplianceAnalyticsDTO>(`/analytics/mines/${mineId}/compliance`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getProduction: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<ProductionAnalyticsDTO> => {
    const res = await api.get<ProductionAnalyticsDTO>(`/analytics/mines/${mineId}/production`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getWorkforce: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<WorkforceAnalyticsDTO> => {
    const res = await api.get<WorkforceAnalyticsDTO>(`/analytics/mines/${mineId}/workforce`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getEnvironment: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<EnvironmentalAnalyticsDTO> => {
    const res = await api.get<EnvironmentalAnalyticsDTO>(`/analytics/mines/${mineId}/environment`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getContractors: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<ContractorAnalyticsDTO> => {
    const res = await api.get<ContractorAnalyticsDTO>(`/analytics/mines/${mineId}/contractors`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getGrievances: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<GrievanceAnalyticsDTO> => {
    const res = await api.get<GrievanceAnalyticsDTO>(`/analytics/mines/${mineId}/grievances`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getFieldOperations: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<FieldOperationsAnalyticsDTO> => {
    const res = await api.get<FieldOperationsAnalyticsDTO>(`/analytics/mines/${mineId}/field-operations`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getPredictiveRisk: async (
    mineId: number,
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<PredictiveRiskAnalyticsDTO> => {
    const res = await api.get<PredictiveRiskAnalyticsDTO>(`/analytics/mines/${mineId}/predictive-risk`, {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  },

  getCrossMine: async (
    rangeType: TimeRangeType = 'LAST_30_DAYS',
    startDate?: string,
    endDate?: string
  ): Promise<CrossMineBenchmarkingDTO> => {
    const res = await api.get<CrossMineBenchmarkingDTO>('/analytics/cross-mine', {
      params: {
        range_type: rangeType,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {})
      }
    });
    return res.data;
  }
};
