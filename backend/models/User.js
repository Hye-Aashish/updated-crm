const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        default: 'employee'
    },
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

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
