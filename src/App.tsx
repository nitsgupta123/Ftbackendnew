import { Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import PackageDashboardPage from "@/pages/packages/PackageDashboardPage";
import PackageModulePage from "@/pages/packages/PackageModulePage";
import AddPackagePage from "@/pages/AddPackagePage";
import BlogsPage from "@/pages/blogs/BlogsPage";
import BlogModulePage from "@/pages/blogs/BlogModulePage";
import NewBlogPage from "@/pages/blogs/NewBlogPage";
import EditBlogPage from "@/pages/blogs/EditBlogPage";
import PagesPage from "@/pages/cms/PagesPage";
import PageModulePage from "@/pages/cms/PageModulePage";
import NewPagePage from "@/pages/cms/NewPagePage";
import EditPagePage from "@/pages/cms/EditPagePage";
import EnquiryPage from "@/pages/EnquiryPage";
import SuppliersPage from "@/pages/SuppliersPage";
import PromotionsPage from "@/pages/PromotionsPage";
import HelpDeskPage from "@/pages/HelpDeskPage";
import SettingsUserManagementPage from "@/pages/settings/SettingsUserManagementPage";
import SettingsRolesPage from "@/pages/settings/SettingsRolesPage";
import SettingsRoleManagementPage from "@/pages/settings/SettingsRoleManagementPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route path="/packages" element={<PackageDashboardPage />} />
      <Route path="/packages/:module" element={<PackageModulePage />} />
      <Route path="/add-package" element={<AddPackagePage />} />

      <Route path="/blogs" element={<BlogsPage />} />
      <Route path="/blogs/new" element={<NewBlogPage />} />
      <Route path="/blogs/edit/:id" element={<EditBlogPage />} />
      <Route path="/blogs/:module" element={<BlogModulePage />} />

      <Route path="/pages" element={<PagesPage />} />
      <Route path="/pages/new" element={<NewPagePage />} />
      <Route path="/pages/edit/:id" element={<EditPagePage />} />
      <Route path="/pages/:module" element={<PageModulePage />} />

      <Route path="/enquiry" element={<EnquiryPage />} />
      <Route path="/suppliers" element={<SuppliersPage />} />
      <Route path="/promotions" element={<PromotionsPage />} />
      <Route path="/help" element={<HelpDeskPage />} />
      <Route path="/settings/user-management" element={<SettingsUserManagementPage />} />
      <Route path="/settings/roles" element={<SettingsRolesPage />} />
      <Route path="/settings/role-management" element={<SettingsRoleManagementPage />} />
      <Route path="/user-management" element={<Navigate to="/settings/user-management" replace />} />
      <Route path="/settings/general" element={<Navigate to="/settings/user-management" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
