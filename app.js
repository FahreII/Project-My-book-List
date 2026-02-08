// ======= Firebase config =======
const firebaseConfig = {
  apiKey: "AIzaSyAPznO6rQlhLWirOL84UkekNRXsrwLVyHo",
  authDomain: "mybooklist-b665c.firebaseapp.com",
  projectId: "mybooklist-b665c",
  storageBucket: "mybooklist-b665c.appspot.com",
  messagingSenderId: "603769733411",
  appId: "1:603769733411:web:2d7d5eef289b94f2ee4c96",
  measurementId: "G-787GP0TLDF",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === "failed-precondition") console.log("Multiple tabs open");
  else if (err.code === "unimplemented") console.log("Browser not supported");
});

// ======= State =======
let books = [];
let filter = "all";
let editIndex = null;
let userId = null;

// ======= DOM elements =======
const list = document.getElementById("list");
const modal = document.getElementById("modal");
const summarySheet = document.getElementById("summarySheet");
const formTitle = document.getElementById("formTitle");
const mainApp = document.getElementById("mainApp");
const fab = document.getElementById("fab");
const loginSheet = document.getElementById("loginSheet");

const judul = document.getElementById("judul");
const penulis = document.getElementById("penulis");
const halaman = document.getElementById("halaman");
const cover = document.getElementById("cover");
const link = document.getElementById("link");
const mulai = document.getElementById("mulai");
const selesai = document.getElementById("selesai");
const status = document.getElementById("status");
const rating = document.getElementById("rating");
const rangkuman = document.getElementById("rangkuman");
const saveBtn = document.getElementById("saveBtn");

// ======= Utility =======
function normalizeStatus(s) {
  return s && s.toString().trim().toLowerCase() === "finished"
    ? "finished"
    : "reading";
}

function ratingClass(r) {
  const n = Number(r);
  if (!r || isNaN(n)) return "rate-gray";
  if (n <= 2) return "rate-purple";
  if (n <= 4) return "rate-red";
  if (n <= 6) return "rate-yellow";
  if (n <= 8) return "rate-green";
  return "rate-blue";
}

// ======= Filters =======
function setFilter(f) {
  filter = f;
  document
    .querySelectorAll(".filter button")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelector(`.filter button[onclick="setFilter('${f}')"]`)
    ?.classList.add("active");
  render();
}

// ======= Render buku =======
function render() {
  list.innerHTML = "";
  books.forEach((b, i) => {
    const s = normalizeStatus(b.status);
    if (filter !== "all" && s !== filter) return;

    list.innerHTML += `
<div class="book">
  <div class="cover" style="background-image:url('${b.cover || ""}')">
    <div class="rating ${ratingClass(b.rating)}">${b.rating || "-"}</div>
  </div>
  <div class="info">
    <div class="title-row">
      <div class="title">${b.judul}</div>
      <div class="status-pill ${s === "finished" ? "status-finished" : "status-reading"}">${s === "finished" ? "Tamat" : "Membaca"}</div>
    </div>
    <div class="author">${b.penulis}</div>
    <div class="meta-pages">${b.halaman ? b.halaman + " halaman" : "Halaman belum diisi"}</div>
    <div class="meta-dates">${b.mulai || "-"} → ${b.selesai || "-"}</div>
    <button class="read-summary" onclick="openSummary(${i})">Baca Rangkuman</button>
    ${b.link ? `<a class="buy-link" href="${b.link}" target="_blank">Beli Buku</a>` : ""}
    <div class="actions">
      <button onclick="editBook(${i})">Edit</button>
      <button class="delete" onclick="removeBook(${i})">Hapus</button>
    </div>
  </div>
</div>`;
  });
}

// ======= Modal =======
function openModal() {
  editIndex = null;
  formTitle.innerText = "Tambah Buku";
  clearForm();
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}

function clearForm() {
  judul.value = "";
  penulis.value = "";
  halaman.value = "";
  cover.value = "";
  link.value = "";
  mulai.value = "";
  selesai.value = "";
  status.value = "reading";
  rating.value = "";
  rangkuman.value = "";
}

// ======= Simpan buku =======
async function saveBook(btn) {
  if (!userId) return alert("Harus login dulu!");

  const data = {
    judul: judul.value,
    penulis: penulis.value,
    halaman: Number(halaman.value) || null,
    cover: cover.value,
    link: link.value,
    mulai: mulai.value || new Date().toISOString().split("T")[0],
    selesai: selesai.value || null,
    status: normalizeStatus(status.value),
    rating: Number(rating.value) || null,
    rangkuman: rangkuman.value,
    userId,
  };

  btn.disabled = true;
  btn.innerText = "Menyimpan...";

  try {
    if (editIndex !== null && books[editIndex]) {
      await db
        .collection("books")
        .doc(books[editIndex].id)
        .set(data, { merge: true });
    } else {
      await db.collection("books").add(data);
    }
    clearForm();
    closeModal();
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Simpan";
  }
}

// ======= Edit & Hapus =======
function editBook(i) {
  const b = books[i];
  editIndex = i;
  formTitle.innerText = "Edit Buku";
  judul.value = b.judul;
  penulis.value = b.penulis;
  halaman.value = b.halaman || "";
  cover.value = b.cover;
  link.value = b.link || "";
  mulai.value = b.mulai || "";
  selesai.value = b.selesai || "";
  status.value = normalizeStatus(b.status);
  rating.value = b.rating || "";
  rangkuman.value = b.rangkuman || "";
  modal.classList.add("active");
}

function removeBook(i) {
  if (!confirm("Hapus buku ini?")) return;
  db.collection("books").doc(books[i].id).delete();
}

// ======= Summary =======
function openSummary(i) {
  const b = books[i];
  document.getElementById("summaryTitle").innerText = b.judul;
  document.getElementById("summaryAuthor").innerText = b.penulis;
  document.getElementById("summaryText").innerText =
    b.rangkuman || "Tidak ada rangkuman.";
  summarySheet.classList.add("active");
}

function closeSummary() {
  summarySheet.classList.remove("active");
}

// ======= Auth & Logout =======
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

auth.onAuthStateChanged((user) => {
  if (user) {
    userId = user.uid;
    loginSheet.classList.remove("active");
    mainApp.style.display = "block";
    fab.style.display = "block";
    loadBooks(); // realtime
  } else {
    userId = null;
    loginSheet.classList.add("active");
    mainApp.style.display = "none";
    fab.style.display = "none";
  }
});

function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  auth
    .signInWithEmailAndPassword(email, password)
    .catch((err) => alert("Login gagal: " + err.message));
}

function signup() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  auth
    .createUserWithEmailAndPassword(email, password)
    .catch((err) => alert("Signup gagal: " + err.message));
}

function logout() {
  auth
    .signOut()
    .then(() => {
      alert("Berhasil logout");
    })
    .catch((err) => alert("Gagal logout: " + err.message));
}

// ======= Load buku realtime =======
function loadBooks() {
  if (!userId) return;
  db.collection("books")
    .where("userId", "==", userId)
    .orderBy("mulai", "desc")
    .onSnapshot((snapshot) => {
      books = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      render();
    });
}
