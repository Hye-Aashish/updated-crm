const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
        type: String,
        default: 'employee',
        enum: ['admin', 'owner', 'pm', 'employee', 'client', 'developer'] // Restrict valid roles
    },
    clientId: { type: String }, // Linked to Client model if role is 'client'
    employeeId: { type: String },
    salutation: { type: String },
    avatar: { type: String },
    phone: { type: String },
    designation: { type: String },
    department: { type: String },
    country: { type: String },
    gender: { type: String },
    dateOfBirth: { type: Date },
    joiningDate: { type: Date },
    reportingTo: { type: String },
    language: { type: String },
    address: { type: String },
    about: { type: String },
    aadharNumber: { type: String },
    panNumber: { type: String },
    documentAadhar: { type: String },
    documentPan: { type: String },
    documentOfferLetter: { type: String },
    salary: { type: String },
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = bcrypt.genSaltSync(12); // Increased from 10 to 12 rounds
    this.password = bcrypt.hashSync(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compareSync(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
