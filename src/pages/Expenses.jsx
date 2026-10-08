
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Expenses() {
  const categories = [
    "Inventory",
    "Marketing",
    "Transport",
    "Utilities",
    "Operations",
    "Rent",
    "Salary",
    "Other",
  ];

  const [expenses, setExpenses] = useState([]);
  const [businessId, setBusinessId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState(null);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "Inventory",
    amount: "",
    payment: "Cash",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------
  // ERROR MESSAGE
  // --------------------------------

  const getErrorMessage = (err) => {
    return (
      err?.message ||
      err?.details ||
      err?.hint ||
      "Something went wrong. Please try again."
    );
  };

  // --------------------------------
  // DATE FORMAT
  // --------------------------------

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(
      yesterday.getDate() - 1
    );

    if (
      date.toDateString() ===
      today.toDateString()
    ) {
      return "Today";
    }

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString();
  };

  // --------------------------------
  // LOAD DATA
  // --------------------------------

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "You are not logged in."
        );
      }

      // Get business
      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (businessError) {
        throw businessError;
      }

      if (!business) {
        throw new Error(
          "Unable to find your business profile."
        );
      }

      setBusinessId(business.id);

      // Load expenses
      const {
        data: expensesData,
        error: expensesError,
      } = await supabase
        .from("expenses")
        .select(
          "id, title, category, amount, payment, created_at"
        )
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: false,
        });

      if (expensesError) {
        throw expensesError;
      }

      const formattedExpenses = (
        expensesData || []
      ).map((expense, index) => ({
        ...expense,

        displayId: `EXP-${String(
          (expensesData.length - index)
        ).padStart(3, "0")}`,

        date: formatDate(
          expense.created_at
        ),
      }));

      setExpenses(formattedExpenses);
    } catch (err) {
      console.error(
        "Expense load error:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------
  // FORM CHANGE
  // --------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------
  // RESET FORM
  // --------------------------------

  const resetForm = () => {
    setForm({
      title: "",
      category: "Inventory",
      amount: "",
      payment: "Cash",
    });

    setEditExpenseId(null);
    setShowForm(false);
    setError("");
  };

  // --------------------------------
  // SAVE EXPENSE
  // --------------------------------

  const saveExpense = async (e) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!businessId) {
      setError(
        "Business profile was not found."
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Please enter a valid expense name."
      );
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError(
        "Please enter a valid expense amount."
      );
      return;
    }

    try {
      setSaving(true);

      const expenseData = {
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        payment: form.payment,
      };

      // --------------------------------
      // EDIT
      // --------------------------------

      if (editExpenseId) {
        const {
          error: updateError,
        } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editExpenseId)
          .eq(
            "business_id",
            businessId
          );

        if (updateError) {
          throw updateError;
        }

        await loadData();
        resetForm();

        return;
      }

      // --------------------------------
      // CREATE
      // --------------------------------

      const {
        error: insertError,
      } = await supabase
        .from("expenses")
        .insert({
          business_id: businessId,
          ...expenseData,
        });

      if (insertError) {
        throw insertError;
      }

      await loadData();
      resetForm();
    } catch (err) {
      console.error(
        "Expense save error:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------
  // EDIT
  // --------------------------------

  const editExpense = (expense) => {
    setForm({
      title: expense.title || "",
      category:
        expense.category || "Inventory",
      amount: expense.amount || "",
      payment:
        expense.payment || "Cash",
    });

    setEditExpenseId(expense.id);
    setShowForm(true);
    setError("");
  };

  // --------------------------------
  // DELETE
  // --------------------------------

  const deleteExpense = async (expense) => {
    const confirmed = window.confirm(
      `Delete ${expense.title}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const {
        error: deleteError,
      } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id)
        .eq(
          "business_id",
          businessId
        );

      if (deleteError) {
        throw deleteError;
      }

      setExpenses((previous) =>
        previous.filter(
          (item) =>
            item.id !== expense.id
        )
      );
    } catch (err) {
      console.error(
        "Expense delete error:",
        err
      );

      setError(
        getErrorMessage(err)
      );
    }
  };

  // --------------------------------
  // FILTER
  // --------------------------------

  const filteredExpenses =
    expenses.filter((expense) =>
      `${expense.title} ${expense.category} ${expense.payment}`
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  // --------------------------------
  // STATS
  // --------------------------------

  const totalExpenses =
    expenses.reduce(
      (total, expense) =>
        total +
        Number(expense.amount || 0),
      0
    );

  const todayExpenses =
    expenses
      .filter((expense) => {
        const createdDate =
          new Date(
            expense.created_at
          );

        const today = new Date();

        return (
          createdDate.toDateString() ===
          today.toDateString()
        );
      })
      .reduce(
        (total, expense) =>
          total +
          Number(expense.amount || 0),
        0
      );

  const thisMonthExpenses =
    expenses
      .filter((expense) => {
        const createdDate =
          new Date(
            expense.created_at
          );

        const today = new Date();

        return (
          createdDate.getMonth() ===
          today.getMonth() &&
          createdDate.getFullYear() ===
          today.getFullYear()
        );
      })
      .reduce(
        (total, expense) =>
          total +
          Number(expense.amount || 0),
        0
      );

  const usedCategories =
    new Set(
      expenses.map(
        (expense) =>
          expense.category
      )
    ).size;

  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            padding: "60px",
            textAlign: "center",
            color: "#71839a",
          }}
        >
          Loading expenses...
        </div>
      </div>
    );
  }

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="page expenses-page">
      {/* HEADER */}

      <div className="page-header">

        <div>
          <span className="label">
            BUSINESS MANAGEMENT
          </span>

          <h1>Expenses</h1>

          <p>
            Track and manage all your
            business expenses.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setEditExpenseId(null);

            setForm({
              title: "",
              category: "Inventory",
              amount: "",
              payment: "Cash",
            });

            setError("");
            setShowForm(true);
          }}
        >
          + Add Expense
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            background:
              "rgba(255, 80, 80, 0.10)",
            border:
              "1px solid rgba(255, 80, 80, 0.25)",
            color: "#ff8d8d",
          }}
        >
          {error}
        </div>
      )}

      {/* STATS */}

      <div className="order-stats">

        <div className="mini-card">

          <span>
            Total Expenses
          </span>

          <strong>
            Rs.{" "}
            {totalExpenses.toLocaleString()}
          </strong>

        </div>

        <div className="mini-card">

          <span>
            This Month
          </span>

          <strong>
            Rs.{" "}
            {thisMonthExpenses.toLocaleString()}
          </strong>

        </div>

        <div className="mini-card">

          <span>
            Today
          </span>

          <strong>
            Rs.{" "}
            {todayExpenses.toLocaleString()}
          </strong>

        </div>

        <div className="mini-card">

          <span>
            Categories
          </span>

          <strong>
            {usedCategories}
          </strong>

        </div>

      </div>

      {/* EXPENSE TABLE */}

      <div className="panel orders-table-panel">

        <div className="panel-header">

          <div>

            <span className="label">
              EXPENSE RECORDS
            </span>

            <h2>
              Recent Expenses
            </h2>

          </div>

          <input
            className="search"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>Expense</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredExpenses.length >
                0 ? (

                filteredExpenses.map(
                  (expense) => (

                    <tr
                      key={expense.id}
                    >

                      <td>

                        <strong>
                          {expense.title}
                        </strong>

                      </td>

                      <td>
                        {expense.category}
                      </td>

                      <td>
                        {expense.date}
                      </td>

                      <td>
                        Rs.{" "}
                        {Number(
                          expense.amount
                        ).toLocaleString()}
                      </td>

                      <td>

                        <b className="paid">
                          {expense.payment}
                        </b>

                      </td>

                      <td>

                        <div className="product-actions">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              editExpense(
                                expense
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              deleteExpense(
                                expense
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="6"
                    style={{
                      textAlign:
                        "center",
                      padding: "40px",
                      color:
                        "#71839a",
                    }}
                  >
                    No expenses found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ADD / EDIT MODAL */}

      {showForm && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="label">
                  EXPENSE MANAGEMENT
                </span>

                <h2>
                  {editExpenseId
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={resetForm}
              >
                ×
              </button>

            </div>

            <form
              onSubmit={saveExpense}
            >

              <label>

                Expense Name

                <input
                  name="title"
                  value={form.title}
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. Facebook Ads"
                  disabled={saving}
                />

              </label>

              <label>

                Category

                <select
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                  className="modal-select"
                  disabled={saving}
                >

                  {categories.map(
                    (category) => (

                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>

                    )
                  )}

                </select>

              </label>

              <label>

                Amount

                <input
                  name="amount"
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={
                    handleChange
                  }
                  placeholder="5000"
                  disabled={saving}
                />

              </label>

              <label>

                Payment Method

                <select
                  name="payment"
                  value={
                    form.payment
                  }
                  onChange={
                    handleChange
                  }
                  className="modal-select"
                  disabled={saving}
                >

                  <option value="Cash">
                    Cash
                  </option>

                  <option value="Online">
                    Online
                  </option>

                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>

                  <option value="Card">
                    Card
                  </option>

                </select>

              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editExpenseId
                      ? "Save Changes"
                      : "Add Expense"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Expenses;