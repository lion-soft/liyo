import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function Orders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [businessId, setBusinessId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editOrderId, setEditOrderId] = useState(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customer_id: "",
    product_id: "",
    quantity: 1,
    amount: "",
    status: "Pending",
  });

  // =========================
  // LOAD BUSINESS + DATA
  // =========================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("You are not logged in.");
      }

      // =========================
      // GET BUSINESS
      // =========================
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

      // =========================
      // LOAD ORDERS
      // =========================
      const {
        data: ordersData,
        error: ordersError,
      } = await supabase
        .from("orders")
        .select(`
          id,
          business_id,
          order_number,
          customer_id,
          product_id,
          quantity,
          amount,
          status,
          created_at,
          customers (
            id,
            name
          ),
          products (
            id,
            name
          )
        `)
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: false,
        });

      if (ordersError) {
        throw ordersError;
      }

      // =========================
      // LOAD PRODUCTS
      // =========================
      const {
        data: productsData,
        error: productsError,
      } = await supabase
        .from("products")
        .select(
          "id, name, category, price, stock, created_at"
        )
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: true,
        });

      if (productsError) {
        throw productsError;
      }

      // =========================
      // LOAD CUSTOMERS
      // =========================
      const {
        data: customersData,
        error: customersError,
      } = await supabase
        .from("customers")
        .select(
          "id, name, phone, email, status, created_at"
        )
        .eq("business_id", business.id)
        .order("created_at", {
          ascending: true,
        });

      if (customersError) {
        throw customersError;
      }

      setOrders(ordersData || []);
      setProducts(productsData || []);
      setCustomers(customersData || []);
    } catch (err) {
      console.error("Orders load error:", err);

      setError(
        err.message ||
        "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FORM CHANGE
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // PRODUCT CHANGE
  // =========================
  const handleProductChange = (e) => {
    const productId = e.target.value;

    const selectedProduct = products.find(
      (product) =>
        product.id === productId
    );

    const quantity =
      Number(form.quantity) || 1;

    setForm((previous) => ({
      ...previous,
      product_id: productId,
      amount: selectedProduct
        ? Number(selectedProduct.price) *
          quantity
        : "",
    }));
  };

  // =========================
  // QUANTITY CHANGE
  // =========================
  const handleQuantityChange = (e) => {
    const quantity = Math.max(
      1,
      Number(e.target.value) || 1
    );

    const selectedProduct =
      products.find(
        (product) =>
          product.id === form.product_id
      );

    setForm((previous) => ({
      ...previous,
      quantity,
      amount: selectedProduct
        ? Number(selectedProduct.price) *
          quantity
        : previous.amount,
    }));
  };

  // =========================
  // RESET FORM
  // =========================
  const resetForm = () => {
    setForm({
      customer_id: "",
      product_id: "",
      quantity: 1,
      amount: "",
      status: "Pending",
    });

    setEditOrderId(null);
    setShowForm(false);
    setError("");
  };

  // =========================
  // GENERATE ORDER NUMBER
  // =========================
  const generateOrderNumber = () => {
    const numbers = orders
      .map((order) =>
        Number(order.order_number)
      )
      .filter((number) =>
        Number.isFinite(number)
      );

    const highest =
      numbers.length > 0
        ? Math.max(...numbers)
        : 1024;

    return highest + 1;
  };

  // =========================
  // SAVE ORDER
  // =========================
  const saveOrder = async (e) => {
    e.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    // =========================
    // BASIC VALIDATION
    // =========================
    if (!businessId) {
      setError(
        "Business profile not found."
      );
      return;
    }

    if (!form.customer_id) {
      setError(
        "Please select a customer."
      );
      return;
    }

    if (!form.product_id) {
      setError(
        "Please select a product."
      );
      return;
    }

    const quantity = Number(
      form.quantity
    );

    const amount = Number(
      form.amount
    );

    if (!quantity || quantity < 1) {
      setError(
        "Quantity must be at least 1."
      );
      return;
    }

    if (!amount || amount <= 0) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    const selectedProduct =
      products.find(
        (product) =>
          product.id === form.product_id
      );

    if (!selectedProduct) {
      setError(
        "Selected product was not found."
      );
      return;
    }

    setSaving(true);

    try {
      // =====================================================
      // EDIT EXISTING ORDER
      // =====================================================
      if (editOrderId) {
        const oldOrder = orders.find(
          (order) =>
            order.id === editOrderId
        );

        if (!oldOrder) {
          throw new Error(
            "The original order could not be found."
          );
        }

        const oldProduct =
          products.find(
            (product) =>
              product.id ===
              oldOrder.product_id
          );

        if (!oldProduct) {
          throw new Error(
            "The original product could not be found."
          );
        }

        // =================================================
        // SAME PRODUCT
        // =================================================
        if (
          oldOrder.product_id ===
          form.product_id
        ) {
          const oldQuantity =
            Number(
              oldOrder.quantity
            );

          const currentStock =
            Number(
              oldProduct.stock || 0
            );

          const stockDifference =
            quantity - oldQuantity;

          const newStock =
            currentStock -
            stockDifference;

          if (newStock < 0) {
            throw new Error(
              `Only ${currentStock} items available in stock.`
            );
          }

          const {
            error: stockError,
          } = await supabase
            .from("products")
            .update({
              stock: newStock,
            })
            .eq(
              "id",
              oldProduct.id
            )
            .eq(
              "business_id",
              businessId
            );

          if (stockError) {
            throw stockError;
          }
        }

        // =================================================
        // DIFFERENT PRODUCT
        // =================================================
        else {
          // Restore old product stock
          const restoredOldStock =
            Number(
              oldProduct.stock || 0
            ) +
            Number(
              oldOrder.quantity || 0
            );

          const {
            error: restoreError,
          } = await supabase
            .from("products")
            .update({
              stock:
                restoredOldStock,
            })
            .eq(
              "id",
              oldProduct.id
            )
            .eq(
              "business_id",
              businessId
            );

          if (restoreError) {
            throw restoreError;
          }

          // Check new product stock
          const newProductStock =
            Number(
              selectedProduct.stock || 0
            );

          if (
            newProductStock <
            quantity
          ) {
            await supabase
              .from("products")
              .update({
                stock:
                  Number(
                    oldProduct.stock ||
                    0
                  ),
              })
              .eq(
                "id",
                oldProduct.id
              )
              .eq(
                "business_id",
                businessId
              );

            throw new Error(
              `Only ${newProductStock} items available in stock.`
            );
          }

          // Deduct new product stock
          const newStock =
            newProductStock -
            quantity;

          const {
            error: deductError,
          } = await supabase
            .from("products")
            .update({
              stock: newStock,
            })
            .eq(
              "id",
              selectedProduct.id
            )
            .eq(
              "business_id",
              businessId
            );

          if (deductError) {
            throw deductError;
          }
        }

        // =================================================
        // UPDATE ORDER
        // =================================================
        const {
          error: updateError,
        } = await supabase
          .from("orders")
          .update({
            customer_id:
              form.customer_id,
            product_id:
              form.product_id,
            quantity,
            amount,
            status:
              form.status,
          })
          .eq(
            "id",
            editOrderId
          )
          .eq(
            "business_id",
            businessId
          );

        if (updateError) {
          throw updateError;
        }
      }

      // =====================================================
      // CREATE NEW ORDER
      // =====================================================
      else {
        const availableStock =
          Number(
            selectedProduct.stock || 0
          );

        if (
          availableStock <
          quantity
        ) {
          throw new Error(
            `Not enough stock. Only ${availableStock} available.`
          );
        }

        const newStock =
          availableStock -
          quantity;

        // DEDUCT PRODUCT STOCK
        const {
          data: updatedProduct,
          error: stockError,
        } = await supabase
          .from("products")
          .update({
            stock: newStock,
          })
          .eq(
            "id",
            selectedProduct.id
          )
          .eq(
            "business_id",
            businessId
          )
          .select(
            "id, stock"
          )
          .single();

        if (stockError) {
          throw stockError;
        }

        if (!updatedProduct) {
          throw new Error(
            "Product stock could not be updated."
          );
        }

        // GENERATE NUMBER
        const orderNumber =
          generateOrderNumber();

        // CREATE ORDER
        const {
          error: orderError,
        } = await supabase
          .from("orders")
          .insert({
            business_id:
              businessId,

            order_number:
              orderNumber,

            customer_id:
              form.customer_id,

            product_id:
              form.product_id,

            quantity,

            amount,

            status:
              form.status,
          });

        // RESTORE STOCK IF ORDER CREATION FAILS
        if (orderError) {
          await supabase
            .from("products")
            .update({
              stock:
                availableStock,
            })
            .eq(
              "id",
              selectedProduct.id
            )
            .eq(
              "business_id",
              businessId
            );

          throw orderError;
        }
      }

      // SUCCESS
      await loadData();

      resetForm();
    } catch (err) {
      console.error(
        "Save order error:",
        err
      );

      setError(
        err.message ||
        "Unable to save order."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // EDIT ORDER
  // =========================
  const editOrder = (order) => {
    setForm({
      customer_id:
        order.customer_id || "",

      product_id:
        order.product_id || "",

      quantity:
        order.quantity || 1,

      amount:
        order.amount || "",

      status:
        order.status || "Pending",
    });

    setEditOrderId(
      order.id
    );

    setShowForm(true);
    setError("");
  };

  // =========================
  // DELETE ORDER
  // =========================
  const deleteOrder = async (
    order
  ) => {
    const confirmed =
      window.confirm(
        `Delete #${order.order_number}?`
      );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const product =
        products.find(
          (item) =>
            item.id ===
            order.product_id
        );

      // RESTORE PRODUCT STOCK
      if (product) {
        const restoredStock =
          Number(
            product.stock || 0
          ) +
          Number(
            order.quantity || 0
          );

        const {
          error: stockError,
        } = await supabase
          .from("products")
          .update({
            stock:
              restoredStock,
          })
          .eq(
            "id",
            product.id
          )
          .eq(
            "business_id",
            businessId
          );

        if (stockError) {
          throw stockError;
        }
      }

      // DELETE ORDER
      const {
        error: deleteError,
      } = await supabase
        .from("orders")
        .delete()
        .eq(
          "id",
          order.id
        )
        .eq(
          "business_id",
          businessId
        );

      if (deleteError) {
        throw deleteError;
      }

      await loadData();
    } catch (err) {
      console.error(
        "Delete order error:",
        err
      );

      setError(
        err.message ||
        "Unable to delete order."
      );
    }
  };

  // =========================
  // FILTER ORDERS
  // =========================
  const filteredOrders =
    orders.filter((order) => {
      const customerName =
        order.customers?.name ||
        "";

      const productName =
        order.products?.name ||
        "";

      const orderNumber =
        order.order_number ||
        "";

      return `
        ${orderNumber}
        ${customerName}
        ${productName}
        ${order.status}
      `
        .toLowerCase()
        .includes(
          search.toLowerCase()
        );
    });

  // =========================
  // STATS
  // =========================
  const totalOrders =
    orders.length;

  const pendingOrders =
    orders.filter(
      (order) =>
        order.status ===
        "Pending"
    ).length;

  const completedOrders =
    orders.filter(
      (order) =>
        order.status ===
        "Paid"
    ).length;

  const revenue =
    orders.reduce(
      (total, order) =>
        total +
        Number(
          order.amount || 0
        ),
      0
    );

  // =========================
  // DATE FORMAT
  // =========================
  const formatDate = (
    date
  ) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#71839a",
          }}
        >
          Loading orders...
        </div>
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="page orders-page">

      {/* HEADER */}
      <div className="page-header">

        <div>

          <span className="label">
            BUSINESS MANAGEMENT
          </span>

          <h1>
            Orders
          </h1>

          <p>
            Manage and track all your customer orders.
          </p>

        </div>

        <button
          className="primary-btn"
          onClick={() => {

            setEditOrderId(null);

            setForm({
              customer_id: "",
              product_id: "",
              quantity: 1,
              amount: "",
              status: "Pending",
            });

            setError("");
            setShowForm(true);

          }}
        >
          + New Order
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div
          style={{
            marginBottom: "18px",
            padding: "12px 16px",
            borderRadius: "10px",
            background:
              "rgba(255, 80, 80, 0.08)",
            border:
              "1px solid rgba(255, 80, 80, 0.25)",
            color: "#ff7b7b",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* STATS */}
      <div className="order-stats">

        <div className="mini-card">

          <span>
            Total Orders
          </span>

          <strong>
            {totalOrders}
          </strong>

        </div>

        <div className="mini-card">

          <span>
            Pending
          </span>

          <strong>
            {pendingOrders}
          </strong>

        </div>

        <div className="mini-card">

          <span>
            Completed
          </span>

          <strong>
            {completedOrders}
          </strong>

        </div>

        <div className="mini-card">

          <span>
            Revenue
          </span>

          <strong>
            Rs.{" "}
            {revenue.toLocaleString()}
          </strong>

        </div>

      </div>

      {/* ORDERS TABLE */}
      <div className="panel orders-table-panel">

        <div className="panel-header">

          <div>

            <span className="label">
              RECENT ORDERS
            </span>

            <h2>
              All Orders
            </h2>

          </div>

          <input
            className="search"
            placeholder="Search orders..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>

                <th>
                  Order
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Product
                </th>

                <th>
                  Date
                </th>

                <th>
                  Amount
                </th>

                <th>
                  Status
                </th>

                <th>
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredOrders.length >
                0 ? (

                filteredOrders.map(
                  (order) => (

                    <tr
                      key={order.id}
                    >

                      <td>
                        #
                        {
                          order.order_number
                        }
                      </td>

                      <td>
                        {
                          order
                            .customers
                            ?.name ||
                          "Unknown Customer"
                        }
                      </td>

                      <td>

                        {
                          order
                            .products
                            ?.name ||
                          "Unknown Product"
                        }

                        <small
                          style={{
                            display:
                              "block",
                            color:
                              "#71839a",
                            marginTop:
                              "4px",
                          }}
                        >
                          Qty:{" "}
                          {
                            order.quantity
                          }
                        </small>

                      </td>

                      <td>
                        {formatDate(
                          order.created_at
                        )}
                      </td>

                      <td>
                        Rs.{" "}
                        {Number(
                          order.amount ||
                          0
                        ).toLocaleString()}
                      </td>

                      <td>

                        <b
                          className={
                            order.status ===
                              "Paid"
                              ? "paid"
                              : "pending"
                          }
                        >
                          {
                            order.status
                          }
                        </b>

                      </td>

                      <td>

                        <div className="product-actions">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              editOrder(
                                order
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              deleteOrder(
                                order
                              )
                            }
                          >
                            Delete
                          </button>

                          {/* NEW: CREATE INVOICE */}
                          <button
                            className="invoice-btn"
                            onClick={() =>
                              navigate(
                                "/invoices",
                                {
                                  state: {
                                    createFromOrder:
                                      true,
                                    order,
                                  },
                                }
                              )
                            }
                          >
                            Invoice
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="7"
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "40px",
                      color:
                        "#71839a",
                    }}
                  >
                    No orders found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* ORDER MODAL */}
      {showForm && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <span className="label">
                  ORDER MANAGEMENT
                </span>

                <h2>
                  {editOrderId
                    ? "Edit Order"
                    : "New Order"}
                </h2>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  resetForm
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                saveOrder
              }
            >

              {/* CUSTOMER */}
              <label>

                Customer

                <select
                  name="customer_id"
                  value={
                    form.customer_id
                  }
                  onChange={
                    handleChange
                  }
                  className="modal-select"
                >

                  <option value="">
                    Select Customer
                  </option>

                  {customers.map(
                    (
                      customer
                    ) => (

                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.name
                        }

                        {customer.phone
                          ? ` — ${customer.phone}`
                          : ""}
                      </option>

                    )
                  )}

                </select>

              </label>

              {/* PRODUCT */}
              <label>

                Product

                <select
                  name="product_id"
                  value={
                    form.product_id
                  }
                  onChange={
                    handleProductChange
                  }
                  className="modal-select"
                >

                  <option value="">
                    Select Product
                  </option>

                  {products.map(
                    (
                      product
                    ) => (

                      <option
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                        disabled={
                          Number(
                            product.stock ||
                            0
                          ) === 0 &&
                          !(
                            editOrderId &&
                            form.product_id ===
                            product.id
                          )
                        }
                      >
                        {
                          product.name
                        }{" "}
                        — Rs.{" "}
                        {Number(
                          product.price ||
                          0
                        ).toLocaleString()}{" "}
                        (
                        {Number(
                          product.stock ||
                          0
                        )} in stock)
                      </option>

                    )
                  )}

                </select>

              </label>

              {/* QUANTITY */}
              <label>

                Quantity

                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={
                    form.quantity
                  }
                  onChange={
                    handleQuantityChange
                  }
                />

              </label>

              {/* TOTAL */}
              <label>

                Total Amount

                <input
                  name="amount"
                  type="number"
                  min="0"
                  value={
                    form.amount
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="4500"
                />

              </label>

              {/* STATUS */}
              <label>

                Payment Status

                <select
                  name="status"
                  value={
                    form.status
                  }
                  onChange={
                    handleChange
                  }
                  className="modal-select"
                >

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Paid">
                    Paid
                  </option>

                </select>

              </label>

              {/* ACTIONS */}
              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    resetForm
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Saving..."
                    : editOrderId
                      ? "Save Changes"
                      : "Create Order"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Orders;