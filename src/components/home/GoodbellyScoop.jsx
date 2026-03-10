import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import tw from "twrnc";
import { authService } from "../../services/authService.js";
import { fontStyles } from "../../utils/fontStyles"; // Import font styles
import { ScoopCardSkeleton } from "../ProductSkeleton";

const GoodbellyScoop = () => {
  const [scoopData, setScoopData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to strip HTML tags and get plain text
  const stripHtmlTags = (html) => {
    if (!html) return "";

    // Replace HTML tags with empty string
    return html
      .replace(/<[^>]*>/g, "") // Remove all HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with regular space
      .replace(/&amp;/g, "&") // Replace &amp; with &
      .replace(/&lt;/g, "<") // Replace &lt; with <
      .replace(/&gt;/g, ">") // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .trim(); // Remove leading/trailing whitespace
  };

  // Function to parse and format the content into structured sections
  const parseContent = (content) => {
    if (!content) return { mainContent: "", sources: "", proTip: "" };

    const cleanContent = stripHtmlTags(content);

    // Initialize sections
    let mainContent = cleanContent;
    let sources = "";
    let proTip = "";

    // Extract Sources section
    const sourcesMatch = cleanContent.match(/Sources:\s*(.*?)(?=Pro tip:|$)/s);
    if (sourcesMatch) {
      sources = sourcesMatch[1].trim();
      mainContent = mainContent.replace(sourcesMatch[0], "").trim();
    }

    // Extract Pro tip section
    const proTipMatch = cleanContent.match(/Pro tip:\s*(.*?)$/s);
    if (proTipMatch) {
      proTip = proTipMatch[1].trim();
      mainContent = mainContent.replace(proTipMatch[0], "").trim();
    }

    // Clean up main content by removing extra spaces and line breaks
    mainContent = mainContent
      .replace(/\s+/g, " ")
      .replace(/([.!?])\s*(?=[A-Z])/g, "$1\n") // Add line breaks after sentences
      .trim();

    return { mainContent, sources, proTip };
  };

  const fetchScoopData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.getScoop();

      if (response && response.data) {
        setScoopData(response.data);
      } else {
        setError("No scoop data available");
      }
    } catch (err) {
      console.error("Error fetching scoop data:", err);
      setError("Failed to load scoop data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoopData();
  }, []);

  if (loading) {
    return <ScoopCardSkeleton />;
  }

  if (error) {
    return (
      <View style={tw`mt-4 px-3 mb-0`}>
        <View style={tw`items-center mb-3`}>
          <Text
            style={[
              fontStyles.headingItalic,
              tw`text-lg font-semibold text-gray-900`,
            ]}
          >
            Goodbelly Scoop
          </Text>
          <Text
            style={[
              fontStyles.body,
              tw`text-xs text-gray-600 text-center mt-0.5`,
            ]}
          >
            Get a scoop of what's trending with the fit folks
          </Text>
        </View>
        <View
          style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100 justify-center items-center h-32`}
        >
          <Text
            style={[fontStyles.body, tw`text-gray-600 text-xs text-center`]}
          >
            {error}
          </Text>
        </View>
      </View>
    );
  }

  // If no scoop data is available from API, don't render anything
  if (!scoopData) {
    return null;
  }

  // Parse the content into structured sections
  const { mainContent, sources, proTip } = parseContent(scoopData.content);

  return (
    <View style={tw`mt-4 px-3 mb-0`}>
      {/* Header - Centered */}
      <View style={tw`items-center mb-3`}>
        <Text
          style={[
            fontStyles.headingItalic,
            tw`text-lg font-semibold text-gray-900`,
          ]}
        >
          Goodbelly Scoop
        </Text>
        <Text
          style={[
            fontStyles.body,
            tw`text-xs text-gray-600 text-center mt-0.5`,
          ]}
        >
          Get a scoop of what's trending with the fit folks
        </Text>
      </View>

      {/* Main Content Card */}
      <View
        style={tw`bg-white rounded-xl p-4 shadow-sm border border-gray-100`}
      >
        {/* Main Title - Only show if heading exists */}
        {scoopData.heading && (
          <Text
            style={[
              fontStyles.headingS,
              tw`text-base font-semibold text-gray-900 mb-3`,
            ]}
          >
            {stripHtmlTags(scoopData.heading)}
          </Text>
        )}

        {/* Main Content */}
        {mainContent && (
          <Text
            style={[fontStyles.body, tw`text-xs text-gray-600 leading-5 mb-3`]}
          >
            {mainContent}
          </Text>
        )}

        {/* Sources Section */}
        {(sources || scoopData.sources) && (
          <View style={tw`mb-3`}>
            <Text
              style={[
                fontStyles.bodyBold,
                tw`text-xs font-semibold text-gray-500 mb-0.5`,
              ]}
            >
              Sources:
            </Text>
            <Text
              style={[fontStyles.body, tw`text-xs text-gray-600 leading-4`]}
            >
              {sources || stripHtmlTags(scoopData.sources)}
            </Text>
          </View>
        )}

        {/* Pro Tip Section */}
        {(proTip || scoopData.proTip) && (
          <View
            style={tw`bg-yellow-50 rounded-lg px-2.5 py-2 border-l-3 border-yellow-400`}
          >
            <Text
              style={[
                fontStyles.bodyBold,
                tw`text-xs font-semibold text-gray-700 mb-0.5`,
              ]}
            >
              Pro tip:
            </Text>
            <Text
              style={[fontStyles.body, tw`text-xs text-gray-600 leading-4`]}
            >
              {proTip || stripHtmlTags(scoopData.proTip)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default GoodbellyScoop;
