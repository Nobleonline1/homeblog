/* public/main.js - COMPLETE AND CORRECTED */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2KFvT6R11v6CnyNfxT2qSBbAzBM3D8HA",
    authDomain: "apartment-8ccc6.firebaseapp.com",
    projectId: "apartment-8ccc6",
    storageBucket: "apartment-8ccc6.appspot.com", // Ensure this matches your actual bucket ID for Firebase Storage (gs://apartment-8ccc6)
    messagingSenderId: "594096160044",
    appId: "1:594096160044:web:7925a4817256392526c089"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Nigerian Cities for dropdowns
const NIGERIAN_CITIES = [
    "Abakaliki", "Aba", "Abeokuta", "Abuja", "Ado Ekiti", "Akure", "Asaba", "Awka",
    "Bauchi", "Benin City", "Birnin Kebbi", "Calabar", "Damaturu", "Dutse", "Enugu",
    "Gombe", "Gusau", "Ibadan", "Ifẹ", "Ilorin", "Jalingo", "Jos", "Kaduna",
    "Kano", "Katsina", "Lafia", "Lagos", "Lokoja", "Makurdi", "Minna", "Maiduguri",
    "Onitsha", "Oshogbo", "Owerri", "Port Harcourt", "Sokoto", "Umuahia", "Uyo", "Warri", "Yenagoa"
].sort();

// --- Authentication Functions ---

/**
 * Handles user registration and sends email verification.
 */
function registerUser() {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const authStatus = document.getElementById('auth-status');

    if (!email || !password) {
        authStatus.innerText = "Email and password are required for registration.";
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(async (userCredential) => { // Make this async to await sendEmailVerification
            const user = userCredential.user;

            // --- START: Email Verification Logic for Registration ---
            await user.sendEmailVerification();
            authStatus.innerText = `Registration successful! A verification email has been sent to ${email}. Please check your inbox (and spam folder) and verify your email before logging in.`;
            alert(`A verification email has been sent to ${email}. Please verify your email before logging in.`);
            
            // Immediately sign out the user after sending verification email
            // This forces them to verify and then log in again.
            await auth.signOut();
            // Clear inputs for the next login attempt
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';

            // Optional: Store initial user data in Firestore with a verification status
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                role: 'tenant', // Default role for new users
                isEmailVerified: false, // Track verification status
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // --- END: Email Verification Logic for Registration ---

        })
        .catch(err => {
            let errorMessage = "Registration error: " + err.message;
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = "This email is already registered. Try logging in or resetting your password.";
            }
            authStatus.innerText = errorMessage;
            alert(errorMessage);
            console.error("Registration error:", err);
        });
}

/**
 * Handles user login and checks for email verification.
 */
function loginUser() {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const authStatus = document.getElementById('auth-status');

    if (!email || !password) {
        authStatus.innerText = "Email and password are required for login.";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;

            // --- START: Email Verification Check for Login ---
            // This is primarily for immediate feedback after login attempts.
            // The main email verification check is in onAuthStateChanged with user.reload()
            if (!user.emailVerified) {
                authStatus.innerHTML = `
                    Your email (${user.email}) is not verified. Please check your inbox for a verification link.
                    <button id="resend-verification-btn" style="margin-top: 10px;">Resend Verification Email</button>
                `;
                alert("Your email address is not verified. Please check your inbox for a verification link.");
                // Add event listener for resend button
                document.getElementById('resend-verification-btn')?.addEventListener('click', () => {
                    resendVerificationEmail(user);
                });
                // Sign out the user until they verify their email
                auth.signOut();
                // Clear inputs
                document.getElementById('email').value = '';
                document.getElementById('password').value = '';
                return; // Stop further execution
            }
            // --- END: Email Verification Check for Login ---

            authStatus.innerText = "Logged in successfully!";
            // Firebase Auth State Listener will handle displaying dashboard sections
            // based on `auth.onAuthStateChanged` below.

            // Optional: If you want to update your Firestore 'users' collection to mark as verified
            // This part is often not strictly necessary as `user.emailVerified` from Auth is canonical.
            // db.collection('users').doc(user.uid).update({ isEmailVerified: true })
            //     .catch(e => console.error("Error updating verification status in Firestore:", e));

        })
        .catch(err => {
            let errorMessage = "Login error: " + err.message;
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                errorMessage = "Invalid email or password.";
            } else if (err.code === 'auth/too-many-requests') {
                 errorMessage = "Too many failed login attempts. Please try again later.";
            }
            authStatus.innerText = errorMessage;
            alert(errorMessage);
            console.error("Login error:", err);
        });
}

/**
 * Resends the email verification link to the user.
 * @param {firebase.User} user - The current Firebase user object.
 */
async function resendVerificationEmail(user) {
    const authStatus = document.getElementById('auth-status');
    try {
        await user.sendEmailVerification();
        authStatus.innerText = "Verification email resent! Please check your inbox (and spam folder).";
        alert("Verification email resent! Please check your inbox (and spam folder).");
    } catch (error) {
        authStatus.innerText = "Error resending verification email: " + error.message;
        alert("Error resending verification email: " + error.message);
        console.error("Error resending verification email:", error);
    }
}


/**
 * Handles user logout.
 */
function logoutUser() {
    auth.signOut().then(() => {
        alert("Logged out successfully.");
        // UI will be handled by onAuthStateChanged listener
    }).catch(err => alert("Logout error: " + err.message));
}

// --- Password Reset Function ---
/**
 * Sends a password reset email to the provided email address.
 */
function resetPassword() {
    const email = document.getElementById('email')?.value.trim();
    const authStatus = document.getElementById('auth-status');

    if (!email) {
        authStatus.innerText = "Please enter your email address to reset your password.";
        return;
    }
    if (!isValidEmail(email)) { // Assuming isValidEmail function exists somewhere
        authStatus.innerText = "Please enter a valid email address.";
        return;
    }

    auth.sendPasswordResetEmail(email)
        .then(() => {
            authStatus.innerText = "Password reset email sent! Check your inbox (and spam folder) for instructions.";
            alert("Password reset email sent! Check your inbox (and spam folder) for instructions.");
        })
        .catch(err => {
            let errorMessage = "Error sending password reset email.";
            switch (err.code) {
                case 'auth/invalid-email':
                    errorMessage = "The email address is not valid.";
                    break;
                case 'auth/user-not-found':
                    errorMessage = "There is no user record corresponding to this email address. It may have been deleted.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Too many requests. Please try again later.";
                    break;
                default:
                    errorMessage += " " + err.message;
                    break;
            }
            authStatus.innerText = errorMessage;
            alert(errorMessage);
            console.error("Password reset error:", err);
        });
}

// Simple email validation (add more robust if needed)
function isValidEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}


// --- Listing Management Functions ---

/**
 * Adds a new listing to the database.
 */
async function addListing() {
    // Check if user is logged in AND email is verified
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
        alert('You must be logged in and have a verified email to add a listing. Please check your email for verification.');
        return;
    }

    const title = document.getElementById('title').value;
    const location = document.getElementById('location').value;
    const rent = document.getElementById('rent').value;
    const description = document.getElementById('description').value;
    const phone = document.getElementById('listing-phone').value;
    const imageFiles = document.getElementById('listing-image').files; // Get all selected files

    if (imageFiles.length === 0) {
        return alert('Please upload at least one photo.');
    }
    

    try {
        const imageUrls = [];
        for (const file of Array.from(imageFiles)) {
            const storageRef = storage.ref(`listing_images/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const url = await snapshot.ref.getDownloadURL();
            imageUrls.push(url);
        }

        await db.collection('listings').add({
            title,
            location,
            rent,
            description,
            phone,
            imageUrls: imageUrls, // Store an array of URLs
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use server timestamp for consistency
            userId: currentUser.uid // Use currentUser here
        });

        alert('Listing added!');
        loadListings(); // Refresh listings
        // Clear form fields after successful submission (optional)
        document.getElementById('title').value = '';
        document.getElementById('location').value = '';
        document.getElementById('rent').value = '';
        document.getElementById('description').value = '';
        document.getElementById('listing-phone').value = '';
        document.getElementById('listing-image').value = ''; // Clear file input
        document.getElementById('image-preview').innerHTML = ''; // Clear image preview

    } catch (err) {
        alert("Error adding listing: " + err.message);
        console.error("Error adding listing:", err);
    }
}

/**
 * Deletes a listing. Can only be done within 10 minutes of creation by the owner.
 * @param {string} id - The ID of the listing to delete.
 * @param {object} timestampData - An object containing the Firestore timestamp.
 */
function deleteListing(id, timestampData) {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
        alert('You must be logged in and have a verified email to delete a listing.');
        return;
    }

    const now = Date.now();
    const createdTime = timestampData.toDate().getTime();
    const tenMinutes = 10 * 60 * 1000;

    if (now - createdTime > tenMinutes) {
        alert("You can only delete listings within 10 minutes of creation.");
        return;
    }

    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;

    db.collection("listings").doc(id).delete()
        .then(() => alert("Listing deleted."))
        .catch(err => alert("Error deleting: " + err.message));
}

/**
 * Allows the owner to edit a listing up to 2 times.
 * @param {string} id - The ID of the listing to edit.
 */
function editListing(id) {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
        alert('You must be logged in and have a verified email to edit a listing.');
        return;
    }

    db.collection("listings").doc(id).get().then(doc => {
        const data = doc.data();
        const edits = data.edits || 0;

        if (edits >= 2) {
            alert("You can only edit a listing up to 2 times.");
            return;
        }

        const newTitle = prompt("Enter new title:", data.title);
        const newLocation = prompt("Enter new location:", data.location);
        const newRent = prompt("Enter new rent:", data.rent);
        const newDescription = prompt("Enter new description:", data.description);
        const newPhone = prompt("Enter new phone number:", data.phone);

        return db.collection("listings").doc(id).update({
            title: newTitle || data.title,
            location: newLocation || data.location,
            rent: newRent || data.rent,
            description: newDescription || data.description,
            phone: newPhone || data.phone,
            edits: edits + 1
        });
    }).then(() => {
        alert("Listing updated.");
        loadListings();
    }).catch(err => alert("Error updating listing: " + err.message));
}

let lastRentedUndo = {}; // For undoing "Mark as Rented"

/**
 * Marks a listing as "rented".
 * @param {string} id - The ID of the listing.
 */
function tagAsRented(id) {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
        alert('You must be logged in and have a verified email to mark a listing as rented.');
        return;
    }

    if (!confirm("Are you sure you want to mark this listing as RENTED OUT?")) return;

    db.collection("listings").doc(id).get().then(doc => {
        lastRentedUndo[id] = doc.data(); // Store original data for undo
        return db.collection("listings").doc(id).update({ rented: true });
    }).then(() => alert("Marked as rented. Click 'Undo' to revert."))
        .catch(err => alert("Error tagging: " + err.message));
}

/**
 * Undoes the "rented" status for a listing.
 * @param {string} id - The ID of the listing.
 */
function undoTagAsRented(id) {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
        alert('You must be logged in and have a verified email to undo this action.');
        return;
    }
    const previous = lastRentedUndo[id];
    if (!previous) return; // No previous state to revert to
    db.collection("listings").doc(id).update({ rented: false })
        .then(() => alert("Reverted 'Rented' status."))
        .catch(err => alert("Error reverting: " + err.message));
}

// --- Contact Support Function ---
// <<< IMPORTANT: Replace with an actual UID and email for your support user >>>
const SUPPORT_UID = "YOUR_ACTUAL_SUPPORT_USER_UID_HERE"; // e.g., 'abcdefg12345'
const SUPPORT_EMAIL = "your.support.email@example.com"; // e.g., 'support@yourdomain.com'

async function contactSupport() {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) { // Check for verification here too
        alert("You must be logged in and have a verified email to contact support.");
        return;
    }

    const messageBody = prompt("Please describe your issue:");

    if (!messageBody || !messageBody.trim()) {
        alert("Message cannot be empty.");
        return;
    }

    try {
        await db.collection("messages").add({
            senderId: user.uid,
            senderEmail: user.email,
            recipientId: SUPPORT_UID,
            recipientEmail: SUPPORT_EMAIL, // Add recipient email for clarity in inbox
            message: messageBody,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Your message has been sent to support!");
    } catch (err) {
        alert("Error sending message to support: " + err.message);
        console.error("Error sending message to support:", err);
    }
}

// --- Call Function for Listings ---
/**
 * Initiates a phone call to the provided phone number.
 * @param {string} phoneNumber - The phone number to call.
 */
function callListingOwner(phoneNumber) {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) { // Check for verification here too
        alert('You must be logged in and have a verified email to call an owner.');
        return;
    }

    if (!phoneNumber) {
        alert("Phone number not available for this listing.");
        return;
    }
    // Use the tel: protocol to trigger a phone call
    window.location.href = `tel:${phoneNumber}`;
}

/**
 * Loads and displays messages for the current user's inbox in real-time.
 * This will now show only messages between the current user and the SUPPORT_UID.
 */
function loadUserInboxLive() {
    const user = auth.currentUser;
    // Only load messages if user is logged in AND verified
    if (!user || !user.emailVerified) {
        const inbox = document.getElementById('message-inbox');
        if (inbox) inbox.innerHTML = '<p>Login and verify your email to view messages.</p>';
        return;
    }

    const inbox = document.getElementById('message-inbox');
    if (!inbox) return; // Ensure the element exists

    inbox.innerHTML = "Loading messages...";

    // Listen for messages where current user is sender or recipient with the SUPPORT_UID
    db.collection("messages")
        .where("senderId", "in", [user.uid, SUPPORT_UID]) // messages sent by user OR support
        .where("recipientId", "in", [user.uid, SUPPORT_UID]) // messages received by user OR support
        .onSnapshot(snapshot => {
            let allMessages = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Filter to ensure messages are ONLY between the current user and SUPPORT_UID
                const isBetweenUserAndSupport =
                    (data.senderId === user.uid && data.recipientId === SUPPORT_UID) ||
                    (data.senderId === SUPPORT_UID && data.recipientId === user.uid);

                if (isBetweenUserAndSupport) {
                    allMessages.push(data);
                }
            });

            // Sort messages by timestamp ascending for conversation flow
            allMessages.sort((a, b) => (a.timestamp?.toDate() || new Date(0)) - (b.timestamp?.toDate() || new Date(0)));

            inbox.innerHTML = "";
            if (allMessages.length === 0) {
                inbox.innerHTML = "<p>No messages with support found. Send a message to start a conversation.</p>";
                return;
            }

            const groupDiv = document.createElement("div");
            groupDiv.classList.add("message-group"); // Add a class for styling
            groupDiv.innerHTML = `<h3>Conversation with Support</h3>`; // Always "Support"

            allMessages.forEach(msg => {
                const direction = msg.senderId === user.uid ? "You" : "Support";
                const msgDiv = document.createElement("div");
                msgDiv.classList.add(msg.senderId === user.uid ? "sent-message" : "received-message"); // For styling messages
                msgDiv.innerHTML = `<strong>${direction}</strong>: ${msg.message} <br><small>${msg.timestamp?.toDate().toLocaleString() || ""}</small>`;
                groupDiv.appendChild(msgDiv);
            });

            // Add reply box for conversation with support
            const replyDiv = document.createElement("div");
            replyDiv.classList.add("reply-box");
            replyDiv.innerHTML = `
                <input type="text" placeholder="Reply to Support..." id="reply-to-support" />
                <button onclick="contactSupportFromReply(document.getElementById('reply-to-support').value)">Send Reply</button>
            `;
            groupDiv.appendChild(replyDiv);

            inbox.appendChild(groupDiv);
        },
        // ADDED: Error handler for the onSnapshot listener
        (error) => {
            console.error("Firestore inbox onSnapshot error:", error);
            const user = auth.currentUser;
            let errorMessage = "Error loading messages. Please try again.";
            if (error.code === 'permission-denied') {
                errorMessage = "Permissions error: You need to be logged in and have a verified email to view messages.";
                if (user && !user.emailVerified) {
                    errorMessage += " Your email is not verified. Check your inbox.";
                } else if (!user) {
                    errorMessage += " You are not logged in.";
                }
            }
            if (inbox) {
                inbox.innerHTML = `<p style="color: red;">${errorMessage}</p>`;
            }
        }
    );
}

/**
 * Helper function for replying directly from the inbox.
 * @param {string} messageBody - The message content.
 */
async function contactSupportFromReply(messageBody) {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) { // Check for verification here too
        alert("You must be logged in and have a verified email to reply to support.");
        return;
    }
    if (!messageBody.trim()) {
        alert("Message cannot be empty.");
        return;
    }

    try {
        await db.collection("messages").add({
            senderId: user.uid,
            senderEmail: user.email,
            recipientId: SUPPORT_UID,
            recipientEmail: SUPPORT_EMAIL,
            message: messageBody,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Clear the input field after sending
        document.getElementById('reply-to-support').value = "";
    } catch (err) {
        alert("Error sending reply to support: " + err.message);
        console.error("Error sending reply to support:", err);
    }
}


// --- Main Listing Display Function ---

/**
 * Loads and displays listings, applying filters.
 * IMPORTANT: This function assumes the calling context (onAuthStateChanged) has
 * ALREADY verified that currentUser is non-null and currentUser.emailVerified is true.
 * It will not perform the checks itself to avoid redundant alerts/messages
 * when called from onAuthStateChanged.
 */
async function loadListings() {
    const container = document.getElementById("listing-container");
    const rentedFilter = document.getElementById("rented-filter")?.value || "all";
    const phoneFilter = document.getElementById("filter-phone")?.value.trim();
    const amountFilter = document.getElementById("filter-rent")?.value.trim();
    const locationFilter = document.getElementById("filter-location")?.value.trim();
    const dateFilter = document.getElementById("filter-date")?.value.trim();

    if (!container) return; // Exit if container doesn't exist

    // The auth check has been primarily moved to the onAuthStateChanged listener to be definitive.
    // If loadListings is called, we assume the user is authenticated and verified.

    container.innerHTML = "Loading listings...";

    db.collection("listings").orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {
            container.innerHTML = "";
            if (snapshot.empty) {
                container.innerHTML = "<p>No listings found.</p>";
                return;
            }

            const currentUser = auth.currentUser; // Get current user inside snapshot for reactivity
            snapshot.forEach(doc => {
                const data = doc.data();
                const isOwner = currentUser && data.userId === currentUser.uid; // Use currentUser
                const isRented = data.rented;

                const createdAtDate = data.createdAt?.toDate?.();
                const createdAtISO = createdAtDate ? createdAtDate.toISOString().slice(0, 10) : "";

                if (
                    (rentedFilter === "rented" && !isRented) ||
                    (rentedFilter === "available" && isRented) ||
                    (phoneFilter && !(data.phone || "").includes(phoneFilter)) ||
                    (amountFilter && parseFloat(data.rent || 0) !== parseFloat(amountFilter)) ||
                    (locationFilter && !(data.location || "").toLowerCase().includes(locationFilter.toLowerCase())) ||
                    (dateFilter && createdAtISO !== dateFilter)
                ) {
                    return; // Skip this listing if it doesn't match filters
                }

                const div = document.createElement("div");
                div.classList.add("listing-item"); // Add a class for styling
                const timestamp = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();

                const imagesHtml = (data.imageUrls || []).map(url => `<img src="${url}" alt="Listing Image" class="preview-image" />`).join('');

                div.innerHTML = `
                    <strong>${data.title}</strong><br>
                    <span><strong>Location:</strong> ${data.location}</span><br>
                    <span><strong>Rent:</strong> ₦${data.rent}</span><br>
                    <span><strong>Description:</strong> ${data.description}</span><br>
                    ${imagesHtml}<br>
                    <em>Phone: ${data.phone || 'Not provided'}</em><br>
                    ${isRented ? '<span class="rented-tag">RENTED OUT</span><br>' : ''}
                    <small>${timestamp.toLocaleString()}</small><br>
                    <div class="listing-actions">
                        ${!isOwner ? `<button onclick="callListingOwner('${data.phone}')">Call Now</button>` : ''}
                        ${isOwner ? `<button onclick="deleteListing('${doc.id}', { toDate: () => new Date('${timestamp.toISOString()}') })">Delete</button>` : ''}
                        ${isOwner && !isRented ? `<button onclick="tagAsRented('${doc.id}')">Mark as Rented</button>` : ''}
                        ${isOwner && isRented ? `<button onclick="undoTagAsRented('${doc.id}')">Undo</button>` : ''}
                        ${isOwner ? `<button onclick="editListing('${doc.id}')">Edit</button>` : ''}
                    </div>
                `;
                container.appendChild(div);
            });
        },
        // ADDED: Error handler for the onSnapshot listener
        (error) => {
            console.error("Firestore listings onSnapshot error:", error);
            const currentUser = auth.currentUser;
            let errorMessage = "Error loading listings. Please try again.";
            if (error.code === 'permission-denied') {
                errorMessage = "Permissions error: You need to be logged in and have a verified email to view listings.";
                if (currentUser && !currentUser.emailVerified) {
                    errorMessage += " Your email is not verified. Check your inbox.";
                } else if (!currentUser) {
                    errorMessage += " You are not logged in.";
                }
            }
            if (container) {
                container.innerHTML = `<p style="color: red;">${errorMessage}</p>`;
            }
        }
    );
}

// --- Utility and UI Setup Functions ---

/**
 * Populates a select dropdown with Nigerian cities.
 * @param {string} selectId - The ID of the select element or datalist.
 */
function populateCityDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    NIGERIAN_CITIES.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
    });
}

/**
 * Handles image file selection for preview.
 * @param {Event} event - The change event from the file input.
 */
function handleImagePreview(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById("image-preview");

    if (!previewContainer) return;

    previewContainer.innerHTML = ""; // Clear existing previews

    Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const wrapper = document.createElement("div");
                wrapper.className = "preview-wrapper";
                wrapper.innerHTML = `
                    <img src="${e.target.result}" class="preview-image" />
                    <button type="button" onclick="removePreviewImage(${index})">Remove</button>
                `;
                previewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        } else {
            console.warn(`File ${file.name} is not an image and won't be previewed.`);
        }
    });
}

/**
 * Removes an image from the preview section (does not affect actual file input).
 * @param {number} index - The index of the image preview to remove.
 */
function removePreviewImage(index) {
    const previewContainer = document.getElementById("image-preview");
    if (previewContainer && previewContainer.children[index]) {
        previewContainer.children[index].remove(); // Use .remove() for direct element removal
    }
    // Note: This only affects the visual preview. To remove the file from being uploaded,
    // you'd need to manage the FileList object, which is more complex in JS directly.
    // For simplicity, users would typically re-select files or rely on backend validation.
}

// --- Event Listeners and Initial Load ---

document.addEventListener("DOMContentLoaded", () => {
    // Setup filter and image preview elements
    const container = document.getElementById("listing-container");
    if (container) {
        // Check if filters already exist to prevent duplication on hot reloads
        if (!document.getElementById("rented-filter")) {
            const filterContainer = document.createElement('div');
            filterContainer.innerHTML = `
                <label for="rented-filter">Sort By: </label>
                <select id="rented-filter" onchange="loadListings()">
                    <option value="all">All</option>
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                </select>
                <input type="text" id="filter-phone" placeholder="Filter by Phone" oninput="loadListings()" />
                <input type="text" id="filter-rent" placeholder="Filter by Amount" oninput="loadListings()" />
                <input list="cities" id="filter-location" placeholder="Filter by Location" oninput="loadListings()" />
                <datalist id="cities"></datalist>
                <input type="date" id="filter-date" oninput="loadListings()" />
            `;
            // Insert filters before the listing container
            container.parentNode.insertBefore(filterContainer, container);
        }

        const imageInput = document.getElementById("listing-image");
        if (imageInput) {
            imageInput.addEventListener("change", handleImagePreview);
        }

        populateCityDropdown("cities"); // For filter
        populateCityDropdown("location"); // For listing creation form
    }

    // Firebase Auth State Listener
    auth.onAuthStateChanged(async user => { // Made async to await user.reload()
        const authSection = document.getElementById('auth-section');
        const dashboardSection = document.getElementById('dashboard-section');
        const listingSection = document.getElementById('listing-section');
        const messagingSection = document.getElementById('messaging-section');
        const userEmailSpan = document.getElementById('user-email');
        const authStatus = document.getElementById('auth-status');
        const listingContainer = document.getElementById("listing-container");
        const inboxContainer = document.getElementById("message-inbox");


        if (user) {
            // Attempt to reload the user's data to get the freshest `emailVerified` status
            try {
                await user.reload(); // This is crucial to get the latest emailVerified status
                console.log("User reloaded. Email Verified (latest):", user.emailVerified);
            } catch (error) {
                console.error("Error reloading user data:", error);
                // Handle error if reload fails, e.g., user token invalid.
                // For now, continue with potentially stale data or log out if critical.
            }

            if (user.emailVerified) {
                // User is logged in and email is verified (confirmed by reload)
                authSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                listingSection.style.display = 'block';
                messagingSection.style.display = 'block';
                if (userEmailSpan) userEmailSpan.innerText = user.email;
                if (authStatus) authStatus.innerText = "Logged in successfully!"; // Clear any previous auth status

                // Now call loadListings and loadUserInboxLive ONLY when confirmed verified
                loadListings();
                loadUserInboxLive();
            } else {
                // User is logged in but email is NOT verified (even after reload)
                authSection.style.display = 'block'; // Keep auth section visible to prompt verification
                dashboardSection.style.display = 'none';
                listingSection.style.display = 'none';
                messagingSection.style.display = 'none';
                if (userEmailSpan) userEmailSpan.innerText = user.email; // Still show email
                authStatus.innerHTML = `
                    Your email (${user.email}) is not verified. Please check your inbox for a verification link.
                    <button id="resend-verification-btn" style="margin-top: 10px;">Resend Verification Email</button>
                `;
                // Clear content if user is unverified
                if (listingContainer) listingContainer.innerHTML = "<p>Login and verify your email to view listings.</p>";
                if (inboxContainer) inboxContainer.innerHTML = '<p>Login and verify your email to view messages.</p>';

                // Attach event listener for resend button if it exists
                document.getElementById('resend-verification-btn')?.addEventListener('click', () => {
                    resendVerificationEmail(user);
                });
            }
        } else {
            // User is signed out.
            authSection.style.display = 'block';
            dashboardSection.style.display = 'none';
            listingSection.style.display = 'none';
            messagingSection.style.display = 'none';
            if (userEmailSpan) userEmailSpan.innerText = '';
            if (authStatus) authStatus.innerText = "Please log in or register.";

            // Clear content when logged out
            if (listingContainer) listingContainer.innerHTML = "<p>Login and verify your email to view listings.</p>";
            if (inboxContainer) inboxContainer.innerHTML = '<p>Login and verify your email to view messages.</p>';
        }
    });

    // --- Event listener attachments for buttons ---
    // Make sure your HTML has these IDs for the buttons
    document.getElementById('register-btn')?.addEventListener('click', registerUser);
    document.getElementById('login-btn')?.addEventListener('click', loginUser);
    document.getElementById('logout-btn')?.addEventListener('click', logoutUser);
    document.getElementById('add-listing-btn')?.addEventListener('click', addListing);
    document.getElementById('reset-password-btn')?.addEventListener('click', resetPassword);
    document.getElementById('contact-support-btn')?.addEventListener('click', contactSupport); // Assuming you have a button for this
});