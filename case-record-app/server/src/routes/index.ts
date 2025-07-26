import { Router } from 'express';
import caseRoutes from './caseRoutes';
import { CrisisType } from '../types';

const router = Router();

// Mount case routes
router.use('/cases', caseRoutes);

/**
 * @swagger
 * /api/crisis-types:
 *   get:
 *     summary: Get available crisis types
 *     tags: [Utilities]
 *     responses:
 *       200:
 *         description: List of available crisis types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/crisis-types', (req, res) => {
  const crisisTypes = [
    {
      value: CrisisType.MENTAL_HEALTH,
      label: 'Mental Health Crisis',
      description: 'Situations involving mental health emergencies, suicide risk, or psychological distress'
    },
    {
      value: CrisisType.DOMESTIC_VIOLENCE,
      label: 'Domestic Violence',
      description: 'Cases involving intimate partner violence, family violence, or domestic abuse'
    },
    {
      value: CrisisType.SUBSTANCE_ABUSE,
      label: 'Substance Abuse',
      description: 'Drug or alcohol-related emergencies, overdoses, or addiction crises'
    },
    {
      value: CrisisType.CHILD_WELFARE,
      label: 'Child Welfare',
      description: 'Child abuse, neglect, or endangerment situations'
    },
    {
      value: CrisisType.ELDER_ABUSE,
      label: 'Elder Abuse',
      description: 'Abuse, neglect, or exploitation of elderly individuals'
    },
    {
      value: CrisisType.GENERAL_EMERGENCY,
      label: 'General Emergency',
      description: 'Other emergency situations not covered by specific categories'
    }
  ];

  res.json({
    success: true,
    data: crisisTypes
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Utilities]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Case Record API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
