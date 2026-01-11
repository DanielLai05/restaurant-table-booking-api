import express, { response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
  },
})

async function getPostgresqlVersion() {

  const client = await pool.connect();
  try {
    const response = await client.query('SELECT version()');
    console.log(response.rows[0]);
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
  }
}

getPostgresqlVersion();


app.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await client.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
})

app.post('/signup', async (req, res) => {
  const { id, name, email } = req.body;
  const client = await pool.connect();
  try {
    const isExists = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (isExists.rows.length > 0) {
      return res.status(400).json({ message: "User existed" });
    }
    const query = 'INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING *';
    const data = [id, name, email];
    const { rows } = await client.query(query, data);
    res.status(201).json({ message: 'User register successful', details: rows[0] })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }

});

app.get('/reservation', async (req, res) => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM bookings ORDER BY id DESC';
    const response = await client.query(query);

    if (response.rows.length === 0) {
      return res.status(404).json({ message: 'No records' });
    }

    res.status(200).json(response.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

app.get('/reservation/:id', async (req, res) => {
  const { id } = req.params
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM bookings WHERE user_id = $1 ORDER BY id DESC';
    const { rows } = await client.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Bookings does not exists" });
    };

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
})

app.post('/reservation', async (req, res) => {

  const { date, number_of_guest, full_name, email, phone_number, description, user_id, title } = req.body;
  if (!date || !number_of_guest || !full_name || !email || !phone_number) {
    return res.status(400).json({ message: "Please fulfill all required fields" });
  }

  const client = await pool.connect();
  try {
    const query = 'INSERT INTO bookings (date, number_of_guest, full_name, email, phone_number, description, user_id, title) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
    const data = [date, number_of_guest, full_name, email, phone_number, description, user_id, title];
    const { rows } = await client.query(query, data);
    res.status(201).json({ message: "Reservation added successful", details: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

app.put('/reservation', async (req, res) => {
  const {
    id,
    date,
    number_of_guest,
    full_name,
    email,
    phone_number,
    description,
    title
  } = req.body;

  if (!date || !number_of_guest || !full_name || !email || !phone_number) {
    return res.status(400).json({ message: "Please fulfill all required fields" });
  }

  const client = pool.connect();
  try {
    const query =
      'UPDATE bookings SET date = $1, number_of_guest = $2, full_name = $3, email = $4, phone_number = $5, description = $6, title = $7 WHERE id = $8 RETURNING *;';

    const data = [
      date,
      number_of_guest,
      full_name,
      email,
      phone_number,
      description,
      title,
      id
    ];

    const { rows } = await (await client).query(query, data);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json({
      message: "Reservation updated",
      details: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

app.delete('/reservation/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    const query =
      'DELETE FROM bookings WHERE id = $1 RETURNING *;';

    const { rows } = await client.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json({
      message: "Reservation deleted successfully",
      deletedReservation: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
  // res.send('Welcome To Restaurant Table Booking Api')
});

app.listen(PORT, () => {
  console.log('App is listening to port 3000');
})