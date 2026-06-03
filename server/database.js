const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'ehosp.db');

class DatabaseManager {
  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    this.initSchema();
    this.seedDoctors();
  }

  initSchema() {
    // Enable WAL mode for performance
    this.db.exec("PRAGMA journal_mode = WAL");

    // Table: Users
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'patient',
        status TEXT DEFAULT 'approved',
        socialSecurityNumber TEXT,
        subscription TEXT DEFAULT 'premium'
      )
    `);

    // Table: Profiles
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        uid TEXT,
        name TEXT,
        birthDate TEXT,
        gender TEXT,
        weight INTEGER,
        height INTEGER,
        chronicConditions TEXT,
        allergies TEXT,
        medications TEXT,
        birthCountry TEXT,
        currentCountry TEXT,
        FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
      )
    `);

    // Table: Sessions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        uid TEXT,
        profileId TEXT,
        title TEXT,
        timestamp INTEGER,
        FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE,
        FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    // Table: Messages
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        role TEXT,
        content TEXT,
        timestamp INTEGER,
        imageBase64 TEXT,
        agent TEXT,
        urgencyScore INTEGER,
        xaiExplanation TEXT,
        sources TEXT,
        isStreaming INTEGER DEFAULT 0,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Table: Consultations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consultations (
        id TEXT PRIMARY KEY,
        patientId TEXT,
        patientName TEXT,
        patientAge INTEGER,
        status TEXT DEFAULT 'pending',
        createdAt INTEGER,
        expiresAt INTEGER,
        doctorId TEXT,
        diagnosis TEXT,
        preDiagnosticPDF TEXT,
        startedAt INTEGER,
        completedAt INTEGER,
        pricing TEXT,
        FOREIGN KEY (patientId) REFERENCES users(uid)
      )
    `);

    // Table: Doctors
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS doctors (
        uid TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        specialization TEXT,
        licenseUrl TEXT,
        experience TEXT,
        bio TEXT,
        status TEXT DEFAULT 'approved',
        submittedAt INTEGER,
        isVerified INTEGER DEFAULT 1,
        isAvailable INTEGER DEFAULT 1,
        expoPushToken TEXT,
        totalEarnings REAL DEFAULT 0.0
      )
    `);

    // Migrate existing DB schemas
    const migrations = [
      "ALTER TABLE doctors ADD COLUMN email TEXT",
      "ALTER TABLE doctors ADD COLUMN licenseUrl TEXT",
      "ALTER TABLE doctors ADD COLUMN experience TEXT",
      "ALTER TABLE doctors ADD COLUMN bio TEXT",
      "ALTER TABLE doctors ADD COLUMN status TEXT DEFAULT 'approved'",
      "ALTER TABLE doctors ADD COLUMN submittedAt INTEGER"
    ];
    migrations.forEach(cmd => {
      try {
        this.db.exec(cmd);
      } catch (err) {
        // Column already exists
      }
    });

    // Table: RAG Chunks (for local vector similarity search)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id TEXT PRIMARY KEY,
        document TEXT,
        content TEXT,
        embedding TEXT
      )
    `);

    console.log("sqlite: Schema initialized successfully in server/ehosp.db");
  }

  seedDoctors() {
    // Seed default specialists if not present
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM doctors");
    const res = stmt.get();
    if (res.count === 0) {
      console.log("sqlite: Seeding doctor accounts...");
      const insert = this.db.prepare(`
        INSERT INTO doctors (uid, name, specialization, isVerified, isAvailable, totalEarnings)
        VALUES (?, ?, ?, 1, 1, 0.0)
      `);
      
      insert.run('doc_1', 'Dr. Dupuis (Cardiologue)', '🫀 Cardiologie');
      insert.run('doc_2', 'Dr. Lemoine (Dermatologue)', '🧴 Dermatologie');
      insert.run('doc_3', 'Dr. Bernard (Pédiatre)', '👶 Pédiatrie');
      insert.run('doc_4', 'Dr. Moretti (Neurologue)', '🧠 Neurologie');
      insert.run('doc_5', 'Dr. Fischer (Généraliste)', '👨‍⚕️ Généraliste');
      console.log("sqlite: Doctors seeded successfully!");
    }

    // Seed admin user
    try {
      const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users WHERE email = ?").get('altayinvestpro@gmail.com');
      if (userCount.count === 0) {
        console.log("sqlite: Seeding admin user account...");
        this.db.prepare(`
          INSERT INTO users (uid, email, password, role, status, subscription)
          VALUES (?, ?, ?, 'admin', 'approved', 'premium')
        `).run('admin_uid', 'altayinvestpro@gmail.com', 'admin123!');
        console.log("sqlite: Admin account created! Email: altayinvestpro@gmail.com, Pass: admin123!");
      }
    } catch (err) {
      console.error("sqlite: Seeding admin user failed:", err.message);
    }
  }

  // --- HELPER OPERATIONS ---

  // Auth Operations
  getUser(uid) {
    return this.db.prepare("SELECT * FROM users WHERE uid = ?").get(uid);
  }

  getUserByEmail(email) {
    return this.db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  }

  createUser(uid, email, password, role = 'patient') {
    this.db.prepare(`
      INSERT INTO users (uid, email, password, role, status, subscription)
      VALUES (?, ?, ?, ?, 'approved', 'premium')
    `).run(uid, email, password, role);
    return this.getUser(uid);
  }

  updateUserSubscription(uid, status) {
    this.db.prepare("UPDATE users SET subscription = ? WHERE uid = ?").run(status, uid);
  }

  // Profiles Operations
  getProfile(id) {
    return this.db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);
  }

  getProfilesByUid(uid) {
    return this.db.prepare("SELECT * FROM profiles WHERE uid = ?").all(uid);
  }

  saveProfile(profile) {
    const existing = this.getProfile(profile.id);
    if (existing) {
      this.db.prepare(`
        UPDATE profiles SET 
          name = ?, birthDate = ?, gender = ?, weight = ?, height = ?, 
          chronicConditions = ?, allergies = ?, medications = ?, 
          birthCountry = ?, currentCountry = ?
        WHERE id = ?
      `).run(
        profile.name, profile.birthDate, profile.gender, profile.weight, profile.height,
        profile.chronicConditions, profile.allergies, profile.medications,
        profile.birthCountry, profile.currentCountry, profile.id
      );
    } else {
      this.db.prepare(`
        INSERT INTO profiles (
          id, uid, name, birthDate, gender, weight, height, 
          chronicConditions, allergies, medications, birthCountry, currentCountry
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        profile.id, profile.uid, profile.name, profile.birthDate, profile.gender, 
        profile.weight, profile.height, profile.chronicConditions, profile.allergies, 
        profile.medications, profile.birthCountry, profile.currentCountry
      );
    }
    return this.getProfile(profile.id);
  }

  // Sessions Operations
  getSession(id) {
    return this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  }

  getSessionsByProfile(uid, profileId) {
    return this.db.prepare("SELECT * FROM sessions WHERE uid = ? AND profileId = ? ORDER BY timestamp DESC").all(uid, profileId);
  }

  saveSession(id, uid, profileId, title, timestamp) {
    const existing = this.getSession(id);
    if (!existing) {
      this.db.prepare("INSERT INTO sessions (id, uid, profileId, title, timestamp) VALUES (?, ?, ?, ?, ?)")
        .run(id, uid, profileId, title, timestamp);
    }
  }

  deleteSession(id) {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  }

  // Messages Operations
  getMessagesBySession(sessionId) {
    return this.db.prepare("SELECT * FROM messages WHERE sessionId = ? ORDER BY timestamp ASC").all(sessionId);
  }

  saveMessage(msg) {
    this.db.prepare(`
      INSERT OR REPLACE INTO messages (
        id, sessionId, role, content, timestamp, imageBase64, agent, urgencyScore, xaiExplanation, sources
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msg.id, msg.sessionId, msg.role, msg.content, msg.timestamp, 
      msg.imageBase64 || null, msg.agent || null, msg.urgencyScore || null, 
      msg.xaiExplanation || null, msg.sources || null
    );
  }

  // Consultations Operations
  getConsultation(id) {
    const c = this.db.prepare("SELECT * FROM consultations WHERE id = ?").get(id);
    if (c && typeof c.pricing === 'string') {
      c.pricing = JSON.parse(c.pricing);
    }
    return c;
  }

  getConsultationsByPatient(patientId) {
    const list = this.db.prepare("SELECT * FROM consultations WHERE patientId = ?").all(patientId);
    return list.map(c => {
      if (typeof c.pricing === 'string') c.pricing = JSON.parse(c.pricing);
      return c;
    });
  }

  getConsultationsByDoctor(doctorId) {
    const list = this.db.prepare("SELECT * FROM consultations WHERE doctorId = ?").all(doctorId);
    return list.map(c => {
      if (typeof c.pricing === 'string') c.pricing = JSON.parse(c.pricing);
      return c;
    });
  }

  saveConsultation(c) {
    this.db.prepare(`
      INSERT OR REPLACE INTO consultations (
        id, patientId, patientName, patientAge, status, createdAt, expiresAt, doctorId, diagnosis, preDiagnosticPDF, startedAt, completedAt, pricing
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      c.id, c.patientId, c.patientName, c.patientAge, c.status, c.createdAt, c.expiresAt,
      c.doctorId || null, c.diagnosis || null, c.preDiagnosticPDF || null,
      c.startedAt || null, c.completedAt || null, JSON.stringify(c.pricing)
    );
  }

  updateConsultationStatus(id, updateFields) {
    const keys = Object.keys(updateFields);
    if (keys.length === 0) return;
    
    const sets = keys.map(k => {
      if (k === 'pricing') {
        updateFields[k] = JSON.stringify(updateFields[k]);
      }
      return `${k} = ?`;
    }).join(', ');
    
    const values = keys.map(k => updateFields[k]);
    values.push(id);

    this.db.prepare(`UPDATE consultations SET ${sets} WHERE id = ?`).run(...values);
  }

  // Doctor planning
  getDoctorsBySpecialty(spec) {
    return this.db.prepare("SELECT * FROM doctors WHERE specialization LIKE ? AND isVerified = 1 AND isAvailable = 1").all(`%${spec}%`);
  }

  saveDoctor(doctor) {
    const existing = this.db.prepare("SELECT * FROM doctors WHERE uid = ?").get(doctor.uid);
    if (existing) {
      const keys = Object.keys(doctor).filter(k => k !== 'uid');
      if (keys.length > 0) {
        const sets = keys.map(k => `${k} = ?`).join(', ');
        const values = keys.map(k => doctor[k]);
        values.push(doctor.uid);
        this.db.prepare(`UPDATE doctors SET ${sets} WHERE uid = ?`).run(...values);
      }
    } else {
      const keys = Object.keys(doctor);
      const placeholders = keys.map(() => '?').join(', ');
      const columns = keys.join(', ');
      const values = keys.map(k => doctor[k]);
      this.db.prepare(`INSERT INTO doctors (${columns}) VALUES (${placeholders})`).run(...values);
    }
    // Sync user role and status if present
    if (doctor.role) {
      this.db.prepare("UPDATE users SET role = ? WHERE uid = ?").run(doctor.role, doctor.uid);
    }
    if (doctor.status) {
      this.db.prepare("UPDATE users SET status = ? WHERE uid = ?").run(doctor.status, doctor.uid);
    }
  }
}

module.exports = new DatabaseManager();
