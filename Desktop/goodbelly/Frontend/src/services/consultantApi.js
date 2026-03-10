import api from "./api";

/**
 * Register a new consultant
 * @param {Object} formData - Consultant registration data
 * @param {File} profileImage - Profile photo file
 * @param {File[]} certifications - Array of certification files
 * @returns {Promise} API response
 */
export const registerConsultant = async (formData, profileImage, certifications) => {
    try {
        const fd = new FormData();

        // Step 1 - Profile fields
        fd.append("name", formData.fullName);
        fd.append("email", formData.email);
        fd.append("phone", formData.phone);
        fd.append("city", formData.city);
        fd.append("password", formData.password);
        fd.append("experience", formData.yearsExperience);
        fd.append("tagline", formData.tagline);
        fd.append("credentials", formData.credentials);

        // Step 2 - Focus fields
        fd.append(
            "specialization",
            formData.specialization === "Other (custom)"
                ? formData.customSpecialization
                : formData.specialization
        );
        fd.append("bio", formData.intro);
        fd.append("approach", formData.approach || "");
        fd.append("languages", JSON.stringify(formData.languages));
        fd.append("focusAreas", JSON.stringify(formData.focusAreas));

        // Step 3 - Consultation fields
        fd.append("durations", JSON.stringify(formData.durations));
        fd.append("availability", JSON.stringify(formData.availability));
        fd.append("consultantTypes", JSON.stringify(formData.consultantTypes));
        fd.append("allowInstantCall", formData.allowInstantCall);
        fd.append("professionalAssociations", formData.professionalAssociations || "");
        fd.append("highlights", JSON.stringify(formData.highlights || []));

        // Files
        if (profileImage) {
            fd.append("profileImage", {
                uri: profileImage.uri,
                type: profileImage.type || "image/jpeg",
                name: profileImage.fileName || "profile.jpg",
            });
        }

        if (certifications && certifications.length > 0) {
            certifications.forEach((file, index) => {
                fd.append("certifications", {
                    uri: file.uri,
                    type: file.type || "application/pdf",
                    name: file.name || `certification_${index}.pdf`,
                });
            });
        }

        const response = await api.post("/consultant", fd, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return {
            success: true,
            data: response.data,
            message: response.data?.message || "Registration successful",
        };
    } catch (error) {
        console.error("Consultant registration error:", error);
        throw {
            success: false,
            message: error.response?.data?.message || "Registration failed. Please try again.",
            error: error.response?.data || error.message,
        };
    }
};

/**
 * Check if email is already registered
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export const checkEmailAvailability = async (email) => {
    try {
        const response = await api.post("/consultant/check-email", { email });
        return response.data?.available || false;
    } catch (error) {
        console.error("Email check error:", error);
        return false;
    }
};
