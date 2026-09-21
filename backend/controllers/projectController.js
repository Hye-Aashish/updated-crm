const Project = require('../models/Project');
const ProjectTemplate = require('../models/ProjectTemplate');
const ProjectCheckpoint = require('../models/ProjectCheckpoint');
const ProjectBug = require('../models/ProjectBug');
const ProjectActivity = require('../models/ProjectActivity');
const ProjectFollowUp = require('../models/ProjectFollowUp');
const { generateAutoInvoice } = require('../services/invoiceService');

// Helper to log audit activity
const logActivity = async (projectId, user, action, description) => {
    try {
        await ProjectActivity.create({
            projectId,
            userId: user?._id || user?.id || 'system',
            userName: user?.name || 'System',
            action,
            description
        });
    } catch (err) {
        console.error("Activity Logging Failed:", err);
    }
};

// Helper to calculate Project Health & Progress
const recalculateProjectMetrics = async (projectId) => {
    try {
        const project = await Project.findById(projectId);
        if (!project) return;

        const checkpoints = await ProjectCheckpoint.find({ projectId });
        const now = new Date();

        if (checkpoints.length === 0) {
            // Keep existing progress if no checkpoints exist yet
            return;
        }

        const total = checkpoints.length;
        const completed = checkpoints.filter(c => c.status === 'completed').length;
        const overdueCount = checkpoints.filter(c => {
            if (c.status === 'completed') return false;
            return c.dueDate && new Date(c.dueDate) < now;
        }).length;

        // Auto-mark overdue status on pending checkpoints
        for (const c of checkpoints) {
            if (c.status !== 'completed' && c.status !== 'blocked' && c.dueDate && new Date(c.dueDate) < now) {
                if (c.status !== 'overdue') {
                    c.status = 'overdue';
                    await c.save();
                }
            }
        }

        const progressPercent = Math.round((completed / total) * 100);
        project.progress = progressPercent;

        // Health rules:
        // COMPLETED if status is completed
        // RED if overdue checkpoints > 0 or status is overdue
        // YELLOW if near deadline or at risk
        // BLUE if on hold
        // GREEN if on track
        if (project.status === 'completed') {
            project.health = 'completed';
        } else if (project.status === 'on-hold') {
            project.health = 'blue';
        } else if (overdueCount > 0 || (project.dueDate && new Date(project.dueDate) < now)) {
            project.health = 'red';
        } else {
            const timeDiffDays = (new Date(project.dueDate) - now) / (1000 * 3600 * 24);
            if (timeDiffDays <= 3 && progressPercent < 80) {
                project.health = 'yellow';
            } else {
                project.health = 'green';
            }
        }

        await project.save();
    } catch (err) {
        console.error("Metric Recalculation Failed:", err);
    }
};

// --- PROJECTS GET / LIST ---
exports.getProjects = async (req, res, next) => {
    try {
        let query = {};
        if (req.user && req.user.role === 'client') {
            query = { clientId: req.user.clientId };
        } else if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            query = {
                $or: [
                    { pmId: userId },
                    { members: userId },
                    { developers: userId },
                    { designers: userId }
                ]
            };
        }

        const projects = await Project.find(query).sort({ createdAt: -1 });

        // Update metric calculations on load asynchronously
        for (const p of projects) {
            recalculateProjectMetrics(p._id);
        }

        res.json(projects);
    } catch (err) {
        next(err);
    }
};

// --- GET PROJECT BY ID ---
exports.getProjectById = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (req.user && req.user.role === 'client') {
            if (project.clientId !== req.user.clientId) {
                return res.status(403).json({ message: 'Not authorized to view this project' });
            }
        } else if (req.user && req.user.role !== 'admin' && req.user.role !== 'owner') {
            const userId = req.user._id.toString();
            const isPM = project.pmId === userId;
            const isMember = (project.members && project.members.includes(userId)) ||
                             (project.developers && project.developers.includes(userId)) ||
                             (project.designers && project.designers.includes(userId));

            if (!isPM && !isMember) {
                return res.status(403).json({ message: 'Not authorized to view this project' });
            }
        }

        await recalculateProjectMetrics(project._id);
        const updated = await Project.findById(req.params.id);
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

// --- CREATE PROJECT WITH TEMPLATE AUTO-GENERATION ---
exports.createProject = async (req, res, next) => {
    try {
        const projectData = {
            ...req.body,
            dueDate: req.body.deadline || req.body.dueDate
        };
        const project = new Project(projectData);
        const newProject = await project.save();

        await logActivity(newProject._id, req.user, 'PROJECT_CREATED', `Project "${newProject.name}" created.`);

        // Auto-generate Checkpoints from Template if projectType is provided
        if (newProject.type && newProject.type !== 'custom') {
            const template = await ProjectTemplate.findOne({ projectType: newProject.type });
            if (template && template.phases && template.phases.length > 0) {
                let checkpointIndexMap = []; // Maps relative index to inserted ObjectId

                let globalIndex = 0;
                let currentStartDate = new Date(newProject.startDate || Date.now());

                for (const phase of template.phases) {
                    for (const cp of phase.checkpoints) {
                        const dueDate = new Date(currentStartDate.getTime() + (cp.defaultDurationDays || 1) * 86400000);

                        // Determine assigned user from developers / PM
                        let assignedUser = newProject.pmId;
                        if (cp.defaultRole === 'developer' && newProject.developers && newProject.developers.length > 0) {
                            assignedUser = newProject.developers[0];
                        } else if (cp.defaultRole === 'designer' && newProject.designers && newProject.designers.length > 0) {
                            assignedUser = newProject.designers[0];
                        }

                        const newCp = await ProjectCheckpoint.create({
                            projectId: newProject._id,
                            phase: phase.name,
                            phaseOrder: phase.order,
                            title: cp.title,
                            order: cp.order || (globalIndex + 1),
                            assignedTo: assignedUser,
                            assignedRole: cp.defaultRole,
                            startDate: currentStartDate,
                            dueDate: dueDate,
                            isMandatory: cp.isMandatory !== false,
                            priority: cp.priority || 'medium',
                            proofRequired: cp.proofRequired || false,
                            proofType: cp.proofType || 'any',
                            approvalRequired: cp.approvalRequired || false,
                            dependencies: []
                        });

                        checkpointIndexMap[globalIndex] = { id: newCp._id, cp: newCp, depIndices: cp.dependencyIndices || [] };
                        globalIndex++;
                        currentStartDate = dueDate; // Cascade expected start dates
                    }
                }

                // Resolve dependencies
                for (const item of checkpointIndexMap) {
                    if (item.depIndices && item.depIndices.length > 0) {
                        const depObjectIds = item.depIndices
                            .map(idx => checkpointIndexMap[idx]?.id)
                            .filter(Boolean);
                        if (depObjectIds.length > 0) {
                            await ProjectCheckpoint.findByIdAndUpdate(item.id, { dependencies: depObjectIds });
                        }
                    }
                }

                await logActivity(newProject._id, req.user, 'CHECKPOINTS_GENERATED', `Generated ${globalIndex} checkpoints from "${template.name}" template.`);
            }
        }

        // Initialize Project Chat Group
        try {
            const ProjectMessage = require('../models/ProjectMessage');
            await ProjectMessage.create({
                projectId: newProject._id,
                senderId: req.user._id,
                senderName: 'System',
                senderRole: 'system',
                message: `Project Collaboration group for "${newProject.name}" has been created. Team and Client can now discuss project details here.`
            });
        } catch (chatError) {
            console.error("Failed to initialize project chat:", chatError);
        }

        await recalculateProjectMetrics(newProject._id);
        const finalProject = await Project.findById(newProject._id);
        res.status(201).json(finalProject);
    } catch (err) {
        next(err);
    }
};

// --- UPDATE PROJECT ---
exports.updateProject = async (req, res, next) => {
    try {
        const oldProject = await Project.findById(req.params.id);
        if (!oldProject) return res.status(404).json({ message: 'Project not found' });

        if (req.user.role === 'client') {
            return res.status(403).json({ message: 'Not authorized to update this project' });
        }

        // VALIDATION CHECK BEFORE MARKING COMPLETED
        if (req.body.status === 'completed' && oldProject.status !== 'completed') {
            const checkpoints = await ProjectCheckpoint.find({ projectId: oldProject._id });
            const uncompletedMandatory = checkpoints.filter(c => c.isMandatory && c.status !== 'completed');
            const criticalBugs = await ProjectBug.find({ projectId: oldProject._id, severity: 'critical', status: { $ne: 'closed' } });

            if (uncompletedMandatory.length > 0 || criticalBugs.length > 0) {
                return res.status(400).json({
                    message: 'Cannot mark project as Completed due to pending requirements',
                    pendingMandatoryCheckpoints: uncompletedMandatory.map(c => c.title),
                    unresolvedCriticalBugs: criticalBugs.map(b => b.title)
                });
            }
        }

        if (req.body.milestones && Array.isArray(req.body.milestones)) {
            const mongoose = require('mongoose');
            req.body.milestones = req.body.milestones.map(m => {
                const clean = { ...m };
                if (clean._id && !mongoose.Types.ObjectId.isValid(clean._id)) delete clean._id;
                if (clean.id && !mongoose.Types.ObjectId.isValid(clean.id)) delete clean.id;
                return clean;
            });
        }

        const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });

        await logActivity(updatedProject._id, req.user, 'PROJECT_UPDATED', `Project details updated by ${req.user.name}.`);

        if (updatedProject.status === 'completed' && oldProject.status !== 'completed' && updatedProject.autoInvoice) {
            try {
                await generateAutoInvoice(updatedProject);
            } catch (billingError) {
                console.error("Auto-billing failed:", billingError);
            }
        }

        await recalculateProjectMetrics(updatedProject._id);
        res.json(updatedProject);
    } catch (err) {
        next(err);
    }
};

// --- DELETE PROJECT ---
exports.deleteProject = async (req, res, next) => {
    try {
        const deletedProject = await Project.findByIdAndDelete(req.params.id);
        if (!deletedProject) return res.status(404).json({ message: 'Project not found' });

        await ProjectCheckpoint.deleteMany({ projectId: req.params.id });
        await ProjectBug.deleteMany({ projectId: req.params.id });
        await ProjectActivity.deleteMany({ projectId: req.params.id });
        await ProjectFollowUp.deleteMany({ projectId: req.params.id });

        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        next(err);
    }
};

// --- CHECKPOINTS API ---
exports.getCheckpoints = async (req, res, next) => {
    try {
        const checkpoints = await ProjectCheckpoint.find({ projectId: req.params.id })
            .populate('dependencies', 'title status isMandatory order')
            .sort({ phaseOrder: 1, order: 1 });
        res.json(checkpoints);
    } catch (err) {
        next(err);
    }
};

exports.createCheckpoint = async (req, res, next) => {
    try {
        const cp = new ProjectCheckpoint({
            ...req.body,
            projectId: req.params.id
        });
        const saved = await cp.save();
        await logActivity(req.params.id, req.user, 'CHECKPOINT_CREATED', `Checkpoint "${saved.title}" created.`);
        await recalculateProjectMetrics(req.params.id);
        res.status(201).json(saved);
    } catch (err) {
        next(err);
    }
};

exports.updateCheckpointStatus = async (req, res, next) => {
    try {
        const cp = await ProjectCheckpoint.findById(req.params.checkpointId).populate('dependencies');
        if (!cp) return res.status(404).json({ message: 'Checkpoint not found' });

        const { status, proofUrl, proofFile, proofVersion, proofRef, remarks } = req.body;

        // 1. DEPENDENCY CHECK FOR COMPLETION
        if (status === 'completed') {
            const pendingDeps = (cp.dependencies || []).filter(dep => dep.status !== 'completed');
            if (pendingDeps.length > 0) {
                return res.status(400).json({
                    message: `Cannot complete "${cp.title}" because required dependencies are pending: ${pendingDeps.map(d => d.title).join(', ')}`,
                    pendingDependencies: pendingDeps.map(d => d.title)
                });
            }

            // 2. PROOF REQUIREMENT CHECK
            if (cp.proofRequired) {
                const hasProof = proofUrl || proofFile || proofVersion || proofRef || req.body.proof;
                if (!hasProof && !cp.proofUrl && !cp.proofFile && !cp.proofVersion && !cp.proofRef) {
                    return res.status(400).json({
                        message: `Proof is required to complete "${cp.title}". Please submit required proof (${cp.proofType}).`
                    });
                }
            }

            cp.completionDate = new Date();
        }

        cp.status = status || cp.status;
        if (proofUrl) cp.proofUrl = proofUrl;
        if (proofFile) cp.proofFile = proofFile;
        if (proofVersion) cp.proofVersion = proofVersion;
        if (proofRef) cp.proofRef = proofRef;
        if (remarks) cp.remarks = remarks;

        if (req.body.assignedTo) cp.assignedTo = req.body.assignedTo;
        if (req.body.dueDate) cp.dueDate = req.body.dueDate;

        // Approval workflow
        if (req.body.approve === true) {
            cp.approvedBy = req.user._id;
            cp.approvedAt = new Date();
            cp.status = 'completed';
        } else if (req.body.reject === true) {
            cp.status = 'rejected';
            cp.rejectionReason = req.body.rejectionReason || 'Rejected by PM/Admin';
        }

        await cp.save();
        await logActivity(cp.projectId, req.user, 'CHECKPOINT_STATUS_CHANGED', `Checkpoint "${cp.title}" updated to status "${cp.status}".`);
        await recalculateProjectMetrics(cp.projectId);

        res.json(cp);
    } catch (err) {
        next(err);
    }
};

exports.deleteCheckpoint = async (req, res, next) => {
    try {
        const cp = await ProjectCheckpoint.findByIdAndDelete(req.params.checkpointId);
        if (!cp) return res.status(404).json({ message: 'Checkpoint not found' });
        await logActivity(cp.projectId, req.user, 'CHECKPOINT_DELETED', `Checkpoint "${cp.title}" removed.`);
        await recalculateProjectMetrics(cp.projectId);
        res.json({ message: 'Checkpoint deleted' });
    } catch (err) {
        next(err);
    }
};

// --- QA & BUGS API ---
exports.getBugs = async (req, res, next) => {
    try {
        const bugs = await ProjectBug.find({ projectId: req.params.id }).sort({ createdAt: -1 });
        res.json(bugs);
    } catch (err) {
        next(err);
    }
};

exports.createBug = async (req, res, next) => {
    try {
        const bug = new ProjectBug({
            ...req.body,
            projectId: req.params.id,
            createdBy: req.user.name || req.user._id
        });
        const saved = await bug.save();
        await logActivity(req.params.id, req.user, 'BUG_REPORTED', `Bug "${saved.title}" reported with severity ${saved.severity}.`);
        res.status(201).json(saved);
    } catch (err) {
        next(err);
    }
};

exports.updateBug = async (req, res, next) => {
    try {
        const updated = await ProjectBug.findByIdAndUpdate(req.params.bugId, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Bug not found' });
        await logActivity(updated.projectId, req.user, 'BUG_UPDATED', `Bug "${updated.title}" status changed to ${updated.status}.`);
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

exports.deleteBug = async (req, res, next) => {
    try {
        const deleted = await ProjectBug.findByIdAndDelete(req.params.bugId);
        if (!deleted) return res.status(404).json({ message: 'Bug not found' });
        res.json({ message: 'Bug deleted' });
    } catch (err) {
        next(err);
    }
};

// --- CLIENT FOLLOW-UPS API ---
exports.getFollowUps = async (req, res, next) => {
    try {
        const followups = await ProjectFollowUp.find({ projectId: req.params.id }).sort({ followUpDate: -1 });
        res.json(followups);
    } catch (err) {
        next(err);
    }
};

exports.createFollowUp = async (req, res, next) => {
    try {
        const followup = new ProjectFollowUp({
            ...req.body,
            projectId: req.params.id,
            createdBy: req.user.name || req.user._id
        });
        const saved = await followup.save();

        // Also update last communication on project
        await Project.findByIdAndUpdate(req.params.id, {
            nextFollowUpDate: saved.followUpDate,
            followUpNotes: saved.summary,
            lastClientUpdate: new Date()
        });

        await logActivity(req.params.id, req.user, 'FOLLOWUP_SCHEDULED', `Follow-up scheduled for ${new Date(saved.followUpDate).toLocaleDateString()}`);
        res.status(201).json(saved);
    } catch (err) {
        next(err);
    }
};

exports.updateFollowUp = async (req, res, next) => {
    try {
        const updated = await ProjectFollowUp.findByIdAndUpdate(req.params.followUpId, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Follow-up not found' });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

// --- AUDIT ACTIVITY LOGS API ---
exports.getActivities = async (req, res, next) => {
    try {
        const activities = await ProjectActivity.find({ projectId: req.params.id }).sort({ createdAt: -1 });
        res.json(activities);
    } catch (err) {
        next(err);
    }
};

// --- DEVELOPER DASHBOARD ITEMS API ---
exports.getDeveloperCheckpoints = async (req, res, next) => {
    try {
        const userId = req.user._id.toString();
        const checkpoints = await ProjectCheckpoint.find({
            $or: [
                { assignedTo: userId },
                { assignedTo: req.user.name }
            ]
        })
        .populate('projectId', 'name type status health priority')
        .populate('dependencies', 'title status')
        .sort({ dueDate: 1 });

        res.json(checkpoints);
    } catch (err) {
        next(err);
    }
};

// --- COMPLETION CHECK ENDPOINT ---
exports.checkCompletionReadiness = async (req, res, next) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const checkpoints = await ProjectCheckpoint.find({ projectId });
        const uncompletedMandatory = checkpoints.filter(c => c.isMandatory && c.status !== 'completed');
        const criticalBugs = await ProjectBug.find({ projectId, severity: 'critical', status: { $ne: 'closed' } });

        const checks = {
            canComplete: uncompletedMandatory.length === 0 && criticalBugs.length === 0,
            totalCheckpoints: checkpoints.length,
            completedCheckpoints: checkpoints.filter(c => c.status === 'completed').length,
            uncompletedMandatoryCount: uncompletedMandatory.length,
            uncompletedMandatoryList: uncompletedMandatory.map(c => ({ id: c._id, title: c.title, phase: c.phase })),
            unresolvedCriticalBugsCount: criticalBugs.length,
            unresolvedCriticalBugsList: criticalBugs.map(b => ({ id: b._id, title: b.title })),
            websiteVerified: project.websiteRequired ? (project.websiteStatus === 'live' || !!project.websiteUrl) : true,
            androidVerified: project.androidRequired ? (project.androidStatus === 'live' || !!project.androidAppUrl) : true,
            iosVerified: project.iosRequired ? (project.iosStatus === 'live' || !!project.iosAppUrl) : true
        };

        res.json(checks);
    } catch (err) {
        next(err);
    }
};

// --- EXISTING NOTE & CREDENTIAL HELPERS (PRESERVED 100%) ---
exports.addNote = async (req, res, next) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Clients are not allowed to add notes' });
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        project.notes.push({ text: req.body.text, createdBy: req.user._id, creatorName: req.user.name });
        await project.save();
        await logActivity(project._id, req.user, 'NOTE_ADDED', `Note added: "${req.body.text.slice(0, 30)}..."`);
        res.status(201).json(project);
    } catch (err) { next(err); }
};

exports.updateNote = async (req, res, next) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Clients are not allowed to edit notes' });
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const note = project.notes.id(req.params.noteId);
        if (!note) return res.status(404).json({ message: 'Note not found' });
        if (note.createdBy !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'owner') return res.status(403).json({ message: 'Not authorized to edit this note' });
        note.text = req.body.text;
        await project.save();
        res.json(project);
    } catch (err) { next(err); }
};

exports.deleteNote = async (req, res, next) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Clients are not allowed to delete notes' });
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const note = project.notes.id(req.params.noteId);
        if (!note) return res.status(404).json({ message: 'Note not found' });
        if (note.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'pm') return res.status(403).json({ message: 'Not authorized to delete this note' });
        project.notes.pull(req.params.noteId);
        await project.save();
        res.json(project);
    } catch (err) { next(err); }
};

exports.addCredential = async (req, res, next) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Clients are not allowed to add credentials' });
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        project.credentials.push({
            title: req.body.title,
            type: req.body.type,
            url: req.body.url,
            username: req.body.username,
            password: req.body.password,
            createdBy: req.user._id
        });
        await project.save();
        await logActivity(project._id, req.user, 'CREDENTIAL_ADDED', `Credential "${req.body.title}" added.`);
        res.status(201).json(project);
    } catch (err) { next(err); }
};

exports.updateCredential = async (req, res, next) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Clients are not allowed to edit credentials' });
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const credential = project.credentials.id(req.params.credentialId);
        if (!credential) return res.status(404).json({ message: 'Credential not found' });
        if (credential.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'pm') return res.status(403).json({ message: 'Not authorized to edit this credential' });
        credential.title = req.body.title;
        credential.type = req.body.type;
        credential.url = req.body.url;
        credential.username = req.body.username;
        if (req.body.password) credential.password = req.body.password;
        await project.save();
        res.json(project);
    } catch (err) { next(err); }
};

exports.deleteCredential = async (req, res, next) => {
    try {
        if (req.user.role === 'client') return res.status(403).json({ message: 'Clients are not allowed to delete credentials' });
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const credential = project.credentials.id(req.params.credentialId);
        if (!credential) return res.status(404).json({ message: 'Credential not found' });
        if (credential.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'pm') return res.status(403).json({ message: 'Not authorized to delete this credential' });
        project.credentials.pull(req.params.credentialId);
        await project.save();
        res.json(project);
    } catch (err) { next(err); }
};
