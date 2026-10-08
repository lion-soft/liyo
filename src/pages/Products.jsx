
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function Products() {
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState([]);
    const [businessId, setBusinessId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [form, setForm] = useState({
        name: "",
        category: "",
        price: "",
        stock: "",
    });

    // Get logged-in user's business
    const getBusiness = async () => {
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const user = session?.user;

        if (!user) {
            throw new Error("User is not logged in.");
        }

        const { data, error } = await supabase
            .from("businesses")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        if (error) {
            throw error;
        }

        return data.id;
    };

    // Load products from Supabase
    const loadProducts = async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const id = await getBusiness();
            setBusinessId(id);

            const { data, error } = await supabase
                .from("products")
                .select("id, name, category, price, stock, created_at")
                .eq("business_id", id)
                .order("created_at", { ascending: true });

            if (error) {
                throw error;
            }

            setProducts(data || []);
        } catch (error) {
            console.error("Products load error:", error);
            setErrorMessage(error.message || "Unable to load products.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const getStatus = (stock) => {
        if (stock === 0) {
            return "Out of Stock";
        }

        if (stock <= 10) {
            return "Low Stock";
        }

        return "In Stock";
    };

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const resetForm = () => {
        setForm({
            name: "",
            category: "",
            price: "",
            stock: "",
        });

        setEditId(null);
        setShowForm(false);
    };

    const addProduct = async (e) => {
        e.preventDefault();

        if (
            !form.name.trim() ||
            !form.category.trim() ||
            form.price === "" ||
            form.stock === ""
        ) {
            return;
        }

        if (!businessId) {
            setErrorMessage("Business profile not found.");
            return;
        }

        try {
            setSaving(true);
            setErrorMessage("");

            const price = Number(form.price);
            const stock = Number(form.stock);

            if (price < 0 || stock < 0) {
                setErrorMessage("Price and stock cannot be negative.");
                return;
            }

            const { data, error } = await supabase
                .from("products")
                .insert([
                    {
                        business_id: businessId,
                        name: form.name.trim(),
                        category: form.category.trim(),
                        price,
                        stock,
                    },
                ])
                .select("id, name, category, price, stock, created_at")
                .single();

            if (error) {
                throw error;
            }

            setProducts((current) => [...current, data]);

            resetForm();
        } catch (error) {
            console.error("Add product error:", error);
            setErrorMessage(error.message || "Unable to add product.");
        } finally {
            setSaving(false);
        }
    };

    const editProduct = async (e) => {
        e.preventDefault();

        if (
            !form.name.trim() ||
            !form.category.trim() ||
            form.price === "" ||
            form.stock === ""
        ) {
            return;
        }

        if (!editId) {
            return;
        }

        try {
            setSaving(true);
            setErrorMessage("");

            const price = Number(form.price);
            const stock = Number(form.stock);

            if (price < 0 || stock < 0) {
                setErrorMessage("Price and stock cannot be negative.");
                return;
            }

            const { data, error } = await supabase
                .from("products")
                .update({
                    name: form.name.trim(),
                    category: form.category.trim(),
                    price,
                    stock,
                })
                .eq("id", editId)
                .eq("business_id", businessId)
                .select("id, name, category, price, stock, created_at")
                .single();

            if (error) {
                throw error;
            }

            setProducts((current) =>
                current.map((product) =>
                    product.id === editId ? data : product
                )
            );

            resetForm();
        } catch (error) {
            console.error("Edit product error:", error);
            setErrorMessage(error.message || "Unable to update product.");
        } finally {
            setSaving(false);
        }
    };

    const deleteProduct = async (product) => {
        const confirmed = window.confirm(
            `Delete ${product.name}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setErrorMessage("");

            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", product.id)
                .eq("business_id", businessId);

            if (error) {
                throw error;
            }

            setProducts((current) =>
                current.filter((item) => item.id !== product.id)
            );
        } catch (error) {
            console.error("Delete product error:", error);
            setErrorMessage(error.message || "Unable to delete product.");
        }
    };

    const openEdit = (product) => {
        setForm({
            name: product.name,
            category: product.category,
            price: product.price,
            stock: product.stock,
        });

        setEditId(product.id);
        setShowForm(true);
        setErrorMessage("");
    };

    const filteredProducts = products.filter((product) =>
        `${product.name} ${product.category}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="page products-page">
            <div className="page-header">
                <div>
                    <span className="label">BUSINESS MANAGEMENT</span>
                    <h1>Products</h1>
                    <p>Manage your products, prices and stock.</p>
                </div>

                <button
                    className="primary-btn"
                    onClick={() => {
                        setEditId(null);
                        setForm({
                            name: "",
                            category: "",
                            price: "",
                            stock: "",
                        });
                        setErrorMessage("");
                        setShowForm(true);
                    }}
                >
                    + Add Product
                </button>
            </div>

            {errorMessage && (
                <div
                    style={{
                        marginBottom: "18px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background: "rgba(255, 70, 70, 0.1)",
                        border: "1px solid rgba(255, 70, 70, 0.25)",
                        color: "#ff8d8d",
                    }}
                >
                    {errorMessage}
                </div>
            )}

            <div className="order-stats">
                <div className="mini-card">
                    <span>Total Products</span>
                    <strong>{products.length}</strong>
                </div>

                <div className="mini-card">
                    <span>In Stock</span>
                    <strong>
                        {products.filter((p) => p.stock > 10).length}
                    </strong>
                </div>

                <div className="mini-card">
                    <span>Low Stock</span>
                    <strong>
                        {
                            products.filter(
                                (p) => p.stock > 0 && p.stock <= 10
                            ).length
                        }
                    </strong>
                </div>

                <div className="mini-card">
                    <span>Out of Stock</span>
                    <strong>
                        {products.filter((p) => p.stock === 0).length}
                    </strong>
                </div>
            </div>

            <div className="panel orders-table-panel">
                <div className="panel-header">
                    <div>
                        <span className="label">PRODUCT INVENTORY</span>
                        <h2>All Products</h2>
                    </div>

                    <input
                        className="search"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign: "center",
                                            padding: "30px",
                                        }}
                                    >
                                        Loading products...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign: "center",
                                            padding: "30px",
                                        }}
                                    >
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const status = getStatus(
                                        Number(product.stock)
                                    );

                                    return (
                                        <tr key={product.id}>
                                            <td>{product.name}</td>

                                            <td>{product.category}</td>

                                            <td>
                                                Rs.{" "}
                                                {Number(
                                                    product.price
                                                ).toLocaleString()}
                                            </td>

                                            <td>{product.stock}</td>

                                            <td>
                                                <b
                                                    className={
                                                        status === "In Stock"
                                                            ? "paid"
                                                            : "pending"
                                                    }
                                                >
                                                    {status}
                                                </b>
                                            </td>

                                            <td>
                                                <div className="product-actions">
                                                    <button
                                                        className="edit-btn"
                                                        onClick={() =>
                                                            openEdit(product)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="delete-btn"
                                                        onClick={() =>
                                                            deleteProduct(
                                                                product
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <span className="label">
                                    PRODUCT MANAGEMENT
                                </span>

                                <h2>
                                    {editId
                                        ? "Edit Product"
                                        : "Add Product"}
                                </h2>
                            </div>

                            <button
                                className="modal-close"
                                onClick={resetForm}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                editId !== null
                                    ? editProduct
                                    : addProduct
                            }
                        >
                            <label>
                                Product Name

                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Premium T-Shirt"
                                />
                            </label>

                            <label>
                                Category

                                <input
                                    name="category"
                                    value={form.category}
                                    onChange={handleChange}
                                    placeholder="e.g. Clothing"
                                />
                            </label>

                            <label>
                                Price

                                <input
                                    name="price"
                                    type="number"
                                    min="0"
                                    value={form.price}
                                    onChange={handleChange}
                                    placeholder="2500"
                                />
                            </label>

                            <label>
                                Stock

                                <input
                                    name="stock"
                                    type="number"
                                    min="0"
                                    value={form.stock}
                                    onChange={handleChange}
                                    placeholder="20"
                                />
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
                                        : editId
                                            ? "Save Changes"
                                            : "Add Product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Products;