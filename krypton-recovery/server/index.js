const express = require("express");
const db = require("./config/db");
const cors = require("cors");

const app = express();

const PORT = 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome." });
});

// Route to get all posts
app.get("/api/getAll", (req, res) => {
  db.query("SELECT * FROM transactions", (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get one post from pk to recover
app.get("/api/getFromPk/:pk", (req, res) => {
  const pk = req.params.pk;
  db.query("SELECT * FROM transactions WHERE pk = ?", pk, (err, result) => {
    if (err) {
      console.log(err);
    }
    console.log("db get res: ", result);
    res.send(result);
  });
});

// Route to get one post from new pk
app.get("/api/getFromNewPk/:new_pk", (req, res) => {
  const new_pk = req.params.new_pk;
  db.query(
    "SELECT * FROM transactions WHERE new_pk = ?",
    new_pk,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});

// Route for creating the post
app.post("/api/create", (req, res) => {
  const pk = req.body.pk;
  const new_pk = req.body.new_pk;
  const sig_remain = req.body.sig_remain;
  const transaction = req.body.transaction;

  db.query(
    "INSERT INTO transactions (pk, new_pk, sig_remain, transaction) VALUES (?,?,?,?)",
    [pk, new_pk, sig_remain, transaction],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result);
      res.send(result);
    }
  );
});

// Route for update transaction
app.post("/api/update", (req, res) => {
  const pk = req.body.pk;
  const new_transaction = req.body.new_transaction;

  db.query(
    "UPDATE transactions SET sig_remain = sig_remain - 1, transaction = ? WHERE pk = ?",
    [new_transaction, pk],
    (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result);
      res.send(result);
    }
  );
});

// Route to delete a transaction
app.delete("/api/delete/:pk", (req, res) => {
  const pk = req.params.pk;

  db.query("DELETE FROM transactions WHERE pk= ?", pk, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send("pk deleted!");
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
