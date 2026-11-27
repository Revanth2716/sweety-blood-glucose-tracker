/**
 * The OpenAPI description of the Sweety API.
 *
 * It is written by hand so that it stays readable and always matches the implementation.
 * The document is served at `/api/openapi.json` and rendered by Swagger UI at `/api/docs`.
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Sweety API',
    version: '1.0.0',
    description:
      'REST API of Sweety, a blood glucose tracker. A patient records up to four readings a ' +
      'day and reads daily, month to date and monthly reports.',
    license: { name: 'MIT' },
  },
  servers: [{ url: '/api', description: 'This server' }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Auth', description: 'Registration, sign in and the current user' },
    { name: 'Readings', description: 'The blood glucose readings of a user' },
    { name: 'Reports', description: 'Daily, month to date and monthly reports' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Please enter a glucose value.' },
              code: { type: 'string', example: 'VALUE_REQUIRED' },
              field: { type: 'string', example: 'value' },
            },
          },
        },
      },
      Reading: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          date: { type: 'string', format: 'date', example: '2026-10-15' },
          slot: {
            type: 'string',
            enum: ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'],
          },
          slotLabel: { type: 'string', example: 'After lunch' },
          value: { type: 'integer', minimum: 40, maximum: 600, example: 142 },
          status: { type: 'string', enum: ['low', 'in-range', 'high'] },
          statusLabel: { type: 'string', example: 'In range' },
          target: {
            type: 'object',
            properties: {
              min: { type: 'integer', example: 70 },
              max: { type: 'integer', example: 180 },
              label: { type: 'string', example: 'Post-meal target 70-180 mg/dl' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ReadingInput: {
        type: 'object',
        required: ['date', 'slot', 'value'],
        properties: {
          date: { type: 'string', format: 'date', example: '2026-10-15' },
          slot: {
            type: 'string',
            enum: ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'],
          },
          value: { type: 'integer', minimum: 40, maximum: 600, example: 142 },
          notes: { type: 'string', maxLength: 280, example: 'Walked before breakfast.' },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['exercise', 'stress'],
          },
        },
      },
      Targets: {
        type: 'object',
        properties: {
          fastingMin: { type: 'integer', example: 70 },
          fastingMax: { type: 'integer', example: 130 },
          postMealMin: { type: 'integer', example: 70 },
          postMealMax: { type: 'integer', example: 180 },
          tirGoal: { type: 'integer', example: 70 },
          a1cGoal: { type: 'number', example: 7 },
        },
      },
      Stats: {
        type: 'object',
        properties: {
          highest: { type: 'number', nullable: true },
          lowest: { type: 'number', nullable: true },
          average: { type: 'number', nullable: true },
          count: { type: 'integer' },
          standardDeviation: { type: 'number', nullable: true },
          inRange: { type: 'integer' },
          belowRange: { type: 'integer' },
          aboveRange: { type: 'integer' },
          timeInRange: { type: 'number', nullable: true, description: 'Percent, 1 decimal' },
          estimatedA1c: { type: 'number', nullable: true, description: 'Estimated A1C in percent' },
        },
      },
      Trend: {
        type: 'object',
        properties: {
          current: { type: 'number', nullable: true },
          previous: { type: 'number', nullable: true },
          change: { type: 'number', nullable: true },
          changePercent: { type: 'number', nullable: true },
          direction: { type: 'string', nullable: true, enum: ['up', 'down', 'flat', null] },
          higherIsBetter: { type: 'string', nullable: true, enum: ['up', 'down', null] },
        },
      },
      Report: {
        type: 'object',
        properties: {
          report: { type: 'string', enum: ['daily', 'month-to-date', 'monthly'] },
          range: {
            type: 'object',
            properties: {
              from: { type: 'string', format: 'date' },
              to: { type: 'string', format: 'date' },
              label: { type: 'string', example: '15 Oct 2026' },
            },
          },
          previousRange: {
            type: 'object',
            properties: {
              from: { type: 'string', format: 'date' },
              to: { type: 'string', format: 'date' },
              label: { type: 'string' },
            },
          },
          stats: { $ref: '#/components/schemas/Stats' },
          trend: {
            type: 'object',
            properties: {
              average: { $ref: '#/components/schemas/Trend' },
              count: { $ref: '#/components/schemas/Trend' },
              timeInRange: { $ref: '#/components/schemas/Trend' },
            },
          },
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slot: { type: 'string' },
                slotLabel: { type: 'string' },
                count: { type: 'integer' },
                average: { type: 'number', nullable: true },
                highest: { type: 'number', nullable: true },
                lowest: { type: 'number', nullable: true },
                target: { type: 'object' },
              },
            },
          },
          readings: { type: 'array', items: { $ref: '#/components/schemas/Reading' } },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check that the API is up',
        responses: {
          200: {
            description: 'The API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    database: { type: 'string', example: 'pglite' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Ada Lovelace' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, example: 'supersecret' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'The account was created' },
          400: { description: 'The input is not valid' },
          409: { description: 'The email is already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'The user is signed in' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'The signed in user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'The current user' },
          401: { description: 'Missing or expired token' },
        },
      },
    },
    '/readings': {
      get: {
        tags: ['Readings'],
        summary: 'List the readings of the signed in user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'The readings and the pagination metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Reading' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Missing or expired token' },
        },
      },
      post: {
        tags: ['Readings'],
        summary: 'Record a reading',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ReadingInput' } },
          },
        },
        responses: {
          201: { description: 'The reading was stored' },
          400: {
            description: 'The value, the date or the slot is not valid',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
          409: {
            description: 'The slot already has a reading on that date',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Error' } },
            },
          },
        },
      },
    },
    '/readings/{id}': {
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      get: {
        tags: ['Readings'],
        summary: 'One reading',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'The reading' },
          404: { description: 'There is no such reading' },
        },
      },
      put: {
        tags: ['Readings'],
        summary: 'Update a reading',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ReadingInput' } },
          },
        },
        responses: {
          200: { description: 'The updated reading' },
          400: { description: 'The input is not valid' },
          404: { description: 'There is no such reading' },
          409: { description: 'The slot already has a reading on that date' },
        },
      },
      delete: {
        tags: ['Readings'],
        summary: 'Delete a reading',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'The reading was deleted' },
          404: { description: 'There is no such reading' },
        },
      },
    },
    '/profile': {
      get: {
        tags: ['Profile'],
        summary: 'The signed in user, the targets and the care team',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'The profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    targets: { $ref: '#/components/schemas/Targets' },
                    careTeam: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          401: { description: 'Missing or expired token' },
        },
      },
    },
    '/profile/targets': {
      put: {
        tags: ['Profile'],
        summary: 'Change the targets and the goals of the user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Targets' } },
          },
        },
        responses: {
          200: { description: 'The new targets' },
          400: { description: 'The targets are not valid' },
          401: { description: 'Missing or expired token' },
        },
      },
    },
    '/care/patients': {
      get: {
        tags: ['Care team'],
        summary: 'The patients of a doctor, with the numbers of the last 30 days',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'The patients' },
          401: { description: 'Missing or expired token' },
          403: { description: 'Only a doctor can see the patients' },
        },
      },
      post: {
        tags: ['Care team'],
        summary: 'Add a patient to the care team of a doctor',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'The patient was added' },
          401: { description: 'Missing or expired token' },
          403: { description: 'Only a doctor can add a patient' },
          404: { description: 'There is no account with that email' },
        },
      },
    },
    '/care/patients/{patientId}': {
      parameters: [
        {
          name: 'patientId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      delete: {
        tags: ['Care team'],
        summary: 'Remove a patient from the care team',
        security: [{ bearerAuth: [] }],
        responses: {
          204: { description: 'The patient was removed' },
          401: { description: 'Missing or expired token' },
          403: { description: 'Only a doctor can remove a patient' },
          404: { description: 'The patient is not in the care team' },
        },
      },
    },
    '/care/patients/{patientId}/report': {
      parameters: [
        {
          name: 'patientId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['daily', 'month-to-date', 'monthly'] },
        },
        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      get: {
        tags: ['Care team'],
        summary: 'The report of a patient',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'The report',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Report' } },
            },
          },
          403: { description: 'The patient is not in your care team' },
        },
      },
    },
    '/care/patients/{patientId}/insights': {
      parameters: [
        {
          name: 'patientId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      get: {
        tags: ['Care team'],
        summary: 'The adherence and the patterns of a patient',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'The insights of the patient' },
          403: { description: 'The patient is not in your care team' },
        },
      },
    },
    '/insights': {
      get: {
        tags: ['Insights'],
        summary: 'The adherence and the patterns of a period',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'The insights',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    period: { type: 'object' },
                    adherence: { type: 'object' },
                    patterns: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          401: { description: 'Missing or expired token' },
        },
      },
    },
    '/readings.csv': {
      get: {
        tags: ['Readings'],
        summary: 'Download every reading as a CSV file',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'The readings as a CSV file',
            content: { 'text/csv': { schema: { type: 'string' } } },
          },
          401: { description: 'Missing or expired token' },
        },
      },
    },
    '/reports/daily': {
      get: {
        tags: ['Reports'],
        summary: 'The report of a single day',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: {
          200: {
            description: 'The report',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Report' } },
            },
          },
        },
      },
    },
    '/reports/month-to-date': {
      get: {
        tags: ['Reports'],
        summary: 'The report from the first of the month up to the selected date',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: {
          200: {
            description: 'The report',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Report' } },
            },
          },
        },
      },
    },
    '/reports/monthly': {
      get: {
        tags: ['Reports'],
        summary: 'The report of the whole previous month',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' } }],
        responses: {
          200: {
            description: 'The report',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Report' } },
            },
          },
        },
      },
    },
  },
};
