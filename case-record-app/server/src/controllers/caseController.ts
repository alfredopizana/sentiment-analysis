import { Request, Response } from 'express';
import { CaseRecord } from '../models/CaseRecord';
import { sentimentAnalysisService } from '../services/sentimentAnalysisService';
import { ApiResponse, PaginatedResponse, UpdateSource } from '../types';

export class CaseController {
  /**
   * Get all cases with pagination and filtering
   */
  async getCases(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        crisisType,
        priority,
        riskLevel,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter: any = {};
      if (status) filter.status = status;
      if (crisisType) filter.crisisType = crisisType;
      if (priority) filter.priority = priority;
      if (riskLevel) filter['assessment.riskLevel'] = riskLevel;
      
      // Add search functionality
      if (search) {
        filter.$or = [
          { caseNumber: { $regex: search, $options: 'i' } },
          { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
          { 'crisisDetails.description': { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const [cases, total] = await Promise.all([
        CaseRecord.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        CaseRecord.countDocuments(filter)
      ]);

      const response: PaginatedResponse<typeof cases[0]> = {
        success: true,
        data: cases,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching cases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cases',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Get a specific case by ID
   */
  async getCaseById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const caseRecord = await CaseRecord.findById(id);
      
      if (!caseRecord) {
        res.status(404).json({
          success: false,
          message: 'Case not found'
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: caseRecord
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch case',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Create a new case
   */
  async createCase(req: Request, res: Response): Promise<void> {
    try {
      const caseData = req.body;
      
      const newCase = new CaseRecord(caseData);
      await newCase.save();

      const response: ApiResponse = {
        success: true,
        data: newCase,
        message: 'Case created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create case',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Update an existing case
   */
  async updateCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingCase = await CaseRecord.findById(id);
      if (!existingCase) {
        res.status(404).json({
          success: false,
          message: 'Case not found'
        });
        return;
      }

      // Track field updates for manual changes
      this.trackFieldUpdates(existingCase, updateData, UpdateSource.USER);

      // Update the case
      Object.assign(existingCase, updateData);
      await existingCase.save();

      const response: ApiResponse = {
        success: true,
        data: existingCase,
        message: 'Case updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update case',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Delete a case
   */
  async deleteCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deletedCase = await CaseRecord.findByIdAndDelete(id);
      
      if (!deletedCase) {
        res.status(404).json({
          success: false,
          message: 'Case not found'
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Case deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete case',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Analyze case with sentiment analysis
   */
  async analyzeCase(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const caseRecord = await CaseRecord.findById(id);
      if (!caseRecord) {
        res.status(404).json({
          success: false,
          message: 'Case not found'
        });
        return;
      }

      // Perform sentiment analysis
      const analyzedCase = await sentimentAnalysisService.analyzeCaseRecord(caseRecord);
      
      // Save the updated case
      Object.assign(caseRecord, analyzedCase);
      await caseRecord.save();

      const response: ApiResponse = {
        success: true,
        data: caseRecord,
        message: 'Case analyzed successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error analyzing case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze case',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Get case statistics
   */
  async getCaseStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        totalCases,
        statusStats,
        crisisTypeStats,
        priorityStats,
        riskLevelStats
      ] = await Promise.all([
        CaseRecord.countDocuments(),
        CaseRecord.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        CaseRecord.aggregate([
          { $group: { _id: '$crisisType', count: { $sum: 1 } } }
        ]),
        CaseRecord.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]),
        CaseRecord.aggregate([
          { $group: { _id: '$assessment.riskLevel', count: { $sum: 1 } } }
        ])
      ]);

      const stats = {
        totalCases,
        statusDistribution: statusStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        crisisTypeDistribution: crisisTypeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        priorityDistribution: priorityStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        riskLevelDistribution: riskLevelStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };

      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching case statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch case statistics',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Track field updates when manually updating a case
   */
  private trackFieldUpdates(existingCase: any, updateData: any, source: UpdateSource, path = ''): void {
    for (const [key, value] of Object.entries(updateData)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const existingValue = this.getNestedValue(existingCase, fieldPath);
      
      if (JSON.stringify(existingValue) !== JSON.stringify(value)) {
        existingCase.addFieldUpdate(
          fieldPath,
          value,
          source,
          existingValue
        );
      }
      
      // Recursively check nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.trackFieldUpdates(existingCase, value, source, fieldPath);
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export const caseController = new CaseController();
