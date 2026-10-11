const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the database module before importing the app
jest.mock('../db', () => ({
    query: jest.fn(),
}));

const db = require('../db');
const app = require('../app');

// Helper to mint a valid token
function makeToken(id, role = 'student') {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('GET /api/claims/mine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 without a token', async() => {
        const res = await request(app).get('/api/claims/mine');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('returns 401 with an invalid token', async() => {
        const res = await request(app)
            .get('/api/claims/mine')
            .set('Authorization', 'Bearer not.a.real.token');
        expect(res.status).toBe(401);
    });

    it("returns only the requesting user's claims", async() => {
        db.query.mockResolvedValueOnce([
            [{
                id: 5,
                status: 'Pending',
                quiz_passed: 1,
                rejection_reason: null,
                created_at: '2026-10-11T10:00:00.000Z',
                reviewed_by: null,
                found_item_id: 12,
                found_report_id: 'FND-111111',
                found_item_name: 'Found wallet',
                found_item_image_url: '/uploads/wallet.jpg',
                found_item_status: 'Posted',
                reviewer_name: null,
            }, ],
        ]);

        const token = makeToken(7);
        const res = await request(app)
            .get('/api/claims/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].status).toBe('Pending');
        expect(res.body.items[0].found_report_id).toBe('FND-111111');

        // Verify the SQL was scoped to the requesting user
        expect(db.query).toHaveBeenCalledTimes(1);
        const [, params] = db.query.mock.calls[0];
        expect(params).toEqual([7]);
    });

    it('returns an empty array when the user has no claims', async() => {
        db.query.mockResolvedValueOnce([
            []
        ]);

        const token = makeToken(42);
        const res = await request(app)
            .get('/api/claims/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
    });

    it('includes reviewer name on Approved/Rejected claims', async() => {
        db.query.mockResolvedValueOnce([
            [{
                id: 9,
                status: 'Approved',
                quiz_passed: 1,
                rejection_reason: null,
                created_at: '2026-10-10T12:00:00.000Z',
                reviewed_by: 3,
                found_item_id: 20,
                found_report_id: 'FND-222222',
                found_item_name: 'Found umbrella',
                found_item_image_url: null,
                found_item_status: 'Returned',
                reviewer_name: 'Admin User',
            }, ],
        ]);

        const token = makeToken(7);
        const res = await request(app)
            .get('/api/claims/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items[0].reviewer_name).toBe('Admin User');
        expect(res.body.items[0].status).toBe('Approved');
    });

    it('includes rejection_reason on Rejected claims', async() => {
        db.query.mockResolvedValueOnce([
            [{
                id: 11,
                status: 'Rejected',
                quiz_passed: 0,
                rejection_reason: 'Failed verification quiz',
                created_at: '2026-10-09T08:00:00.000Z',
                reviewed_by: null,
                found_item_id: 22,
                found_report_id: 'FND-333333',
                found_item_name: 'Found watch',
                found_item_image_url: null,
                found_item_status: 'Posted',
                reviewer_name: null,
            }, ],
        ]);

        const token = makeToken(7);
        const res = await request(app)
            .get('/api/claims/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items[0].status).toBe('Rejected');
        expect(res.body.items[0].rejection_reason).toBe(
            'Failed verification quiz'
        );
    });

    it('returns 500 if the database query fails', async() => {
        db.query.mockRejectedValueOnce(new Error('DB down'));

        const token = makeToken(7);
        const res = await request(app)
            .get('/api/claims/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error');
    });
});