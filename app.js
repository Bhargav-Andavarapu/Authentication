const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//API-1 Register a new user
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const checkIsExistingUser = `
        SELECT
            *
        FROM
            user
        WHERE
            username = "${username}";
    `;
  const dbUser = await db.get(checkIsExistingUser);

  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const passwordLength = password.length;
    if (passwordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const registerNewUserQuery = `
                INSERT INTO
                    user(username, name, password, gender, location)
                VALUES (
                    "${username}",
                    "${name}",
                    "${hashedPassword}",
                    "${gender}",
                    "${location}"
                );
            `;
      await db.run(registerNewUserQuery);
      response.send("User created successfully");
    }
  }
});

//API-2 Login
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `
        SELECT
            *
        FROM
            user
        WHERE
            username = "${username}";
    `;
  const dbUser = await db.get(checkUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API-3 Change Password
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkExistingUser = `
        SELECT
            *
        FROM
            user
        WHERE
            username = "${username}";
    `;
  const dbUser = await db.get(checkExistingUser);

  if (dbUser !== undefined) {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isPasswordMatched === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                    UPDATE
                        user
                    SET
                        password = "${hashedPassword}"
                    WHERE
                        username = "${username}";
                `;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

module.exports = app;
