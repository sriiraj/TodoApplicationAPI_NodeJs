const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const databasePath = path.join(__dirname, "todoApplication.db");
const app = express();
app.use(express.json());
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const TodoResponseFormat = (obj) => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    category: obj.category,
    status: obj.status,
    dueDate: obj.due_date,
  };
};

const ValidateStatus = (requestQuery) => {
  return (
    requestQuery.status === "TO DO" ||
    requestQuery.status === "DONE" ||
    requestQuery.status === "IN PROGRESS" ||
    requestQuery.status === "" ||
    requestQuery.status === undefined ||
    requestQuery.status === null
  );
};

const ValidatePriority = (requestQuery) => {
  return (
    requestQuery.priority === "HIGH" ||
    requestQuery.priority === "LOW" ||
    requestQuery.priority === "MEDIUM" ||
    requestQuery.priority === "" ||
    requestQuery.priority === undefined ||
    requestQuery.priority === null
  );
};

const ValidateCategory = (requestQuery) => {
  return (
    requestQuery.category === "WORK" ||
    requestQuery.category === "HOME" ||
    requestQuery.category === "LEARNING" ||
    requestQuery.category === "" ||
    requestQuery.category === undefined ||
    requestQuery.category === null
  );
};
app.get("/todos", async (req, res) => {
  let { priority = "", status = "", category = "", search_q = "" } = req.query;
  let data = null;
  let getTodosQuery = "";
  if (!ValidateStatus(req.query)) {
    res.status(400);
    res.send("Invalid Todo Status");
  } else if (!ValidatePriority(req.query)) {
    res.status(400);
    res.send("Invalid Todo Priority");
  } else if (!ValidateCategory(req.query)) {
    res.status(400);
    res.send("Invalid Todo Category");
  } else {
    getTodosQuery = `SELECT * FROM todo where todo like '%${search_q}%' and status like '%${status}%' and priority like '%${priority}%' and category like '%${category}%'`;
    data = await database.all(getTodosQuery);
    res.send(data.map((i) => TodoResponseFormat(i)));
  }
});

app.get("/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const getTodoQuery = `SELECT  *  FROM  todo WHERE id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  res.send(TodoResponseFormat(todo));
});

app.get("/agenda/", async (req, res) => {
  const { date } = req.query;
  const NewDate = new Date(date);
  if (!isValid(NewDate)) {
    res.status(400);
    res.send("Invalid Due Date");
  } else {
    const FormatDate = format(new Date(NewDate), "yyyy-MM-dd");
    const DateQuery = `SELECT  *  FROM  todo WHERE due_date = '${FormatDate}';`;
    const data = await database.all(DateQuery);
    res.send(data.map((i) => TodoResponseFormat(i)));
  }
});

app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const NewDate = new Date(dueDate);
  if (!ValidateStatus(req.body)) {
    res.status(400);
    res.send("Invalid Todo Status");
  } else if (!ValidatePriority(req.body)) {
    res.status(400);
    res.send("Invalid Todo Priority");
  } else if (!ValidateCategory(req.body)) {
    res.status(400);
    res.send("Invalid Todo Category");
  } else if (!isValid(NewDate)) {
    res.status(400);
    res.send("Invalid Due Date");
  } else {
    const FormatDate = format(new Date(NewDate), "yyyy-MM-dd");
    const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${FormatDate}');`;
    await database.run(postTodoQuery);
    res.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;
  const NewDate = new Date(dueDate);
  if (!ValidateStatus(request.body)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!ValidatePriority(request.body)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!ValidateCategory(request.body)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (!isValid(NewDate)) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date='${dueDate}'
    WHERE
      id = ${todoId};`;

    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
module.exports = app;
