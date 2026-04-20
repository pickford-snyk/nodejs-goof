const { Sequelize, DataTypes } = require('sequelize');
const assert = require('assert');

// Test configuration - using in-memory SQLite for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false // Set to console.log to see SQL queries
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false
});

describe('Sequelize Tests', () => {
  before(async () => {
    // Sync database schema
    await sequelize.sync({ force: true });
  });

  after(async () => {
    // Close database connection
    await sequelize.close();
  });

  describe('Connection', () => {
    test('should establish database connection', async () => {
      try {
        await sequelize.authenticate();
        assert.ok(true, 'Connection has been established successfully.');
      } catch (error) {
        assert.fail('Unable to connect to the database: ' + error.message);
      }
    });
  });

  describe('User Model', () => {
    test('should create a new user', async () => {
      const user = await User.create({
        name: 'John Doe',
        address: '123 Main St',
        role: 'user'
      });

      assert.strictEqual(user.name, 'John Doe');
      assert.strictEqual(user.address, '123 Main St');
      assert.strictEqual(user.role, 'user');
      assert.ok(user.id, 'User should have an ID');
    });

    test('should find a user by ID', async () => {
      const createdUser = await User.create({
        name: 'Jane Smith',
        address: '456 Oak Ave',
        role: 'admin'
      });

      const foundUser = await User.findByPk(createdUser.id);
      assert.ok(foundUser, 'User should be found');
      assert.strictEqual(foundUser.name, 'Jane Smith');
      assert.strictEqual(foundUser.role, 'admin');
    });

    test('should find users by role', async () => {
      await User.create({
        name: 'Admin User',
        address: '789 Pine Rd',
        role: 'admin'
      });

      const adminUsers = await User.findAll({
        where: {
          role: 'admin'
        }
      });

      assert.ok(adminUsers.length >= 1, 'Should find at least one admin user');
      adminUsers.forEach(user => {
        assert.strictEqual(user.role, 'admin');
      });
    });

    test('should update a user', async () => {
      const user = await User.create({
        name: 'Original Name',
        address: 'Original Address',
        role: 'user'
      });

      await user.update({
        name: 'Updated Name',
        address: 'Updated Address'
      });

      const updatedUser = await User.findByPk(user.id);
      assert.strictEqual(updatedUser.name, 'Updated Name');
      assert.strictEqual(updatedUser.address, 'Updated Address');
      assert.strictEqual(updatedUser.role, 'user'); // Should remain unchanged
    });

    test('should delete a user', async () => {
      const user = await User.create({
        name: 'To Be Deleted',
        address: 'Delete Me',
        role: 'user'
      });

      const userId = user.id;
      await user.destroy();

      const deletedUser = await User.findByPk(userId);
      assert.strictEqual(deletedUser, null, 'User should be deleted');
    });

    test('should count all users', async () => {
      const count = await User.count();
      assert.ok(count >= 0, 'Count should be a non-negative number');
    });

    test('should find all users with pagination', async () => {
      // Create multiple users
      for (let i = 0; i < 5; i++) {
        await User.create({
          name: `User ${i}`,
          address: `Address ${i}`,
          role: 'user'
        });
      }

      const users = await User.findAll({
        limit: 3,
        offset: 0
      });

      assert.ok(users.length <= 3, 'Should return at most 3 users');
    });

    test('should use transactions', async () => {
      return sequelize.transaction(async (t) => {
        const user1 = await User.create({
          name: 'Transaction User 1',
          address: 'TX Address 1',
          role: 'user'
        }, { transaction: t });

        const user2 = await User.create({
          name: 'Transaction User 2',
          address: 'TX Address 2',
          role: 'user'
        }, { transaction: t });

        assert.ok(user1.id, 'First user should be created');
        assert.ok(user2.id, 'Second user should be created');
      });
    });
  });

  describe('Query Operations', () => {
    test('should use raw queries with parameterized queries (secure)', async () => {
      await User.create({
        name: 'Raw Query User',
        address: 'Raw Address',
        role: 'user'
      });

      // Use parameterized queries to prevent SQL injection
      const [results, metadata] = await sequelize.query(
        "SELECT * FROM users WHERE name = :name",
        {
          replacements: { name: 'Raw Query User' },
          type: sequelize.QueryTypes.SELECT
        }
      );

      assert.ok(results.length > 0, 'Should return results from raw query');
      assert.strictEqual(results[0].name, 'Raw Query User');
    });

    test('should use findOne with where clause', async () => {
      await User.create({
        name: 'FindOne User',
        address: 'FindOne Address',
        role: 'admin'
      });

      const user = await User.findOne({
        where: {
          name: 'FindOne User'
        }
      });

      assert.ok(user, 'User should be found');
      assert.strictEqual(user.name, 'FindOne User');
    });

    test('should use findOrCreate', async () => {
      const [user, created] = await User.findOrCreate({
        where: { name: 'FindOrCreate User' },
        defaults: {
          address: 'FindOrCreate Address',
          role: 'user'
        }
      });

      assert.ok(user, 'User should exist or be created');
      assert.strictEqual(created, true, 'User should be created on first call');

      const [user2, created2] = await User.findOrCreate({
        where: { name: 'FindOrCreate User' },
        defaults: {
          address: 'FindOrCreate Address',
          role: 'user'
        }
      });

      assert.strictEqual(created2, false, 'User should not be created on second call');
    });
  });
});
