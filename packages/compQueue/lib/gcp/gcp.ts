import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CATEGORIZATION_API_URL = process.env.CATEGORIZATION_API_URL;

export async function standardizeSubCategory(subCategory: string): Promise<string> {
  if (!subCategory) {
    throw new Error("A non-empty subCategory is required");
  }

  try {
    if (!CATEGORIZATION_API_URL) {
      console.warn('[standardizeSubCategory] CATEGORIZATION_API_URL is not set, returning fallback');
      return "uncategorized description";
    }

    const response = await axios.post(
      CATEGORIZATION_API_URL,
      { complaint: subCategory },
      { timeout: 10000 }
    );

    const issueType = response.data?.data?.issue_type;
    if (issueType && typeof issueType === 'string') {
      const formattedIssueType = issueType.replace(/_/g, ' ');
      console.log(`[standardizeSubCategory] "${subCategory}" → "${formattedIssueType}"`);
      return formattedIssueType;
    }

    console.warn('[standardizeSubCategory] Unexpected response format, returning fallback');
    return "uncategorized description";
  } catch (error: any) {
    console.warn(`[standardizeSubCategory] API call failed: ${error.message}, returning fallback`);
    return "uncategorized description";
  }
}
