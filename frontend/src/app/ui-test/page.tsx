"use client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";
import Dialog from "@/components/ui/Dialog";
import Toast from "@/components/ui/Toast";
import Alert from "@/components/ui/Alert";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Tabs from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Dropdown from "@/components/ui/Dropdown";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import StatusBadge from "@/components/ui/StatusBadge";
import SearchBar from "@/components/ui/SearchBar";
import FilterBar from "@/components/ui/FilterBar";
import Rating from "@/components/ui/Rating";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import Calendar from "@/components/ui/Calendar";
import ProviderCard from "@/components/ui/ProviderCard";
import ServiceCard from "@/components/ui/ServiceCard";
import BookingCard from "@/components/ui/BookingCard";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";

export default function UITestPage() {
const [modalOpen, setModalOpen] = useState(false);
const [dialogOpen, setDialogOpen] = useState(false);
const [toastOpen, setToastOpen] = useState(true);
const [activeTab, setActiveTab] = useState("services");
const [currentPage, setCurrentPage] = useState(1);
const [selectedDate, setSelectedDate] = useState("");
const [selectedTime, setSelectedTime] = useState("");
  return (
    <main className="min-h-screen bg-background py-12">
      <div className="container">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10">
            <p className="text-sm font-bold uppercase tracking-wider text-brand">
              Shared UI
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Core Components
            </h1>

            <p className="mt-3 text-muted">
              Temporary visual test page for the shared design system.
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">
                  Buttons
                </h2>
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">
                    Primary
                  </Button>

                  <Button variant="secondary">
                    Secondary
                  </Button>

                  <Button variant="outline">
                    Outline
                  </Button>

                  <Button variant="ghost">
                    Ghost
                  </Button>

                  <Button variant="danger">
                    Delete
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button size="sm">
                    Small
                  </Button>

                  <Button size="md">
                    Medium
                  </Button>

                  <Button size="lg">
                    Large
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">
                  Form Controls
                </h2>
              </CardHeader>

              <CardContent>
                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="Service Name"
                    placeholder="Enter service name"
                  />

                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    hint="We'll never share your email."
                  />

                  <Input
                    label="Invalid Field"
                    placeholder="Something went wrong"
                    error="This field is required."
                  />

                  <Select
                    label="Category"
                    name="category"
                    placeholder="Select a category"
                    options={[
                      {
                        label: "Beauty",
                        value: "beauty",
                      },
                      {
                        label: "Home Services",
                        value: "home",
                      },
                      {
                        label: "Tutoring",
                        value: "tutoring",
                      },
                    ]}
                  />

                  <div className="md:col-span-2">
                    <Textarea
                      label="Description"
                      placeholder="Describe the service..."
                      hint="Keep the description clear and useful."
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <div className="flex justify-end gap-3">
                  <Button variant="outline">
                    Cancel
                  </Button>

                  <Button>
                    Save Service
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">
                  Badges & Status
                </h2>
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Badge>
                    Default
                  </Badge>

                  <Badge variant="success">
                    Confirmed
                  </Badge>

                  <Badge variant="warning">
                    Pending
                  </Badge>

                  <Badge variant="danger">
                    Cancelled
                  </Badge>

                  <Badge variant="info">
                    Information
                  </Badge>

                  <Badge variant="plum">
                    Premium
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">
                  Loading
                </h2>
              </CardHeader>
              <section className="space-y-8">
  <div>
    <h2 className="text-2xl font-bold">
      Feedback & Overlays
    </h2>

    <p className="mt-2 text-muted">
      Temporary preview of shared feedback components.
    </p>
  </div>

  <Card>
    <CardHeader>
      <h2 className="text-xl font-semibold">
        Alerts
      </h2>
    </CardHeader>

    <CardContent>
      <div className="space-y-4">
        <Alert
          variant="success"
          title="Booking confirmed"
        >
          Your appointment has been successfully confirmed.
        </Alert>

        <Alert
          variant="warning"
          title="Pending payment"
        >
          Complete payment before the booking hold expires.
        </Alert>

        <Alert
          variant="error"
          title="Payment failed"
        >
          We could not process your payment.
        </Alert>

        <Alert
          variant="info"
          title="Information"
        >
          Your provider has updated their availability.
        </Alert>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <h2 className="text-xl font-semibold">
        Modal & Dialog
      </h2>
    </CardHeader>

    <CardContent>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setModalOpen(true)}>
          Open Modal
        </Button>

        <Button
          variant="danger"
          onClick={() => setDialogOpen(true)}
        >
          Open Confirmation
        </Button>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <h2 className="text-xl font-semibold">
        Toast
      </h2>
    </CardHeader>

    <CardContent>
      {toastOpen ? (
        <Toast
          open
          variant="success"
          title="Success"
          message="Your changes were saved successfully."
          onClose={() => setToastOpen(false)}
        />
      ) : (
        <Button onClick={() => setToastOpen(true)}>
          Show Toast
        </Button>
      )}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <h2 className="text-xl font-semibold">
        States
      </h2>
    </CardHeader>

    <CardContent>
      <div className="space-y-6">
        <LoadingState
          message="Loading bookings..."
          minHeight="sm"
        />

        <EmptyState
          title="No bookings yet"
          description="Your upcoming appointments will appear here."
          action={
            <Button size="sm">
              Find a Service
            </Button>
          }
        />

        <ErrorState
          title="Unable to load bookings"
          message="Please check your connection and try again."
          action={
            <Button variant="outline" size="sm">
              Try Again
            </Button>
          }
        />
      </div>
    </CardContent>
  </Card>
</section>
<section className="relative space-y-8 rounded-card border border-line bg-surface p-6 pt-8 md:p-8 md:pt-10">
  <div className="absolute -top-4 left-6 bg-surface px-3 md:left-8">
    <h2 className="text-xl font-bold text-foreground md:text-2xl">
      Navigation & Data UI
    </h2>
  </div>

  <p className="text-sm text-muted">
    Temporary preview of reusable navigation and data components.
  </p>

  <div className="space-y-8">
    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Breadcrumbs
      </h3>

      <Breadcrumbs
        items={[
          {
            label: "Dashboard",
            href: "/dashboard",
          },
          {
            label: "Bookings",
            href: "/dashboard/bookings",
          },
          {
            label: "Booking Details",
          },
        ]}
      />
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Tabs
      </h3>

      <Tabs
        tabs={[
          {
            id: "services",
            label: "Services",
            content: (
              <p className="text-muted">
                Services content goes here.
              </p>
            ),
          },
          {
            id: "reviews",
            label: "Reviews",
            content: (
              <p className="text-muted">
                Reviews content goes here.
              </p>
            ),
          },
          {
            id: "availability",
            label: "Availability",
            content: (
              <p className="text-muted">
                Availability content goes here.
              </p>
            ),
          },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Dropdown
      </h3>

      <Dropdown
        trigger={
          <Button variant="outline">
            Actions
          </Button>
        }
        items={[
          {
            label: "View Details",
            onClick: () => {},
          },
          {
            label: "Edit",
            onClick: () => {},
          },
          {
            label: "Delete",
            onClick: () => {},
            danger: true,
          },
        ]}
      />
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Status Badges
      </h3>

      <div className="flex flex-wrap gap-3">
        <StatusBadge status="pending" />
        <StatusBadge status="confirmed" />
        <StatusBadge status="completed" />
        <StatusBadge status="cancelled" />
        <StatusBadge status="paid" />
        <StatusBadge status="failed" />
        <StatusBadge status="refunded" />
        <StatusBadge status="approved" />
        <StatusBadge status="rejected" />
      </div>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Pagination
      </h3>

      <Pagination
        currentPage={currentPage}
        totalPages={5}
        onPageChange={setCurrentPage}
      />

      <p className="mt-3 text-center text-sm text-muted">
        Current page: {currentPage}
      </p>
    </div>
  </div>
</section>
<section className="relative space-y-8 rounded-card border border-line bg-surface p-6 pt-8 md:p-8 md:pt-10">
  <div className="absolute -top-4 left-6 bg-surface px-3 md:left-8">
    <h2 className="text-xl font-bold text-foreground md:text-2xl">
      Discovery & Booking UI
    </h2>
  </div>

  <p className="text-sm text-muted">
    Temporary preview of reusable discovery and booking components.
  </p>

  <div className="space-y-10">
    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Search Bar
      </h3>

      <SearchBar
        placeholder="Search for a service..."
        onSearch={(value) => console.log(value)}
      />
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Filters
      </h3>

      <FilterBar onClear={() => {}}>
        <Select
          label="Category"
          options={[
            { label: "Beauty", value: "beauty" },
            { label: "Home Services", value: "home" },
          ]}
          placeholder="All categories"
        />

        <Select
          label="Location"
          options={[
            { label: "Rawalpindi", value: "rawalpindi" },
            { label: "Islamabad", value: "islamabad" },
          ]}
          placeholder="All locations"
        />

        <Input
          label="Min Price"
          type="number"
          placeholder="0"
        />

        <Input
          label="Max Price"
          type="number"
          placeholder="10000"
        />
      </FilterBar>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Rating
      </h3>

      <div className="space-y-2">
        <Rating value={4.5} count={128} />
        <Rating value={3.8} count={42} size="sm" />
        <Rating value={5} size="lg" />
      </div>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Date & Time
      </h3>

      <div className="grid gap-6 lg:grid-cols-2">
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          label="Booking Date"
        />

        <TimePicker
          value={selectedTime}
          onChange={setSelectedTime}
          times={[
            "09:00 AM",
            "10:00 AM",
            "11:30 AM",
            "02:00 PM",
            "04:00 PM",
            "06:00 PM",
          ]}
        />
      </div>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Calendar
      </h3>

      <div className="max-w-md">
        <Calendar
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </div>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Provider Cards
      </h3>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <ProviderCard
          id="provider-1"
          name="Ayesha Beauty Studio"
          category="Beauty & Wellness"
          location="Islamabad"
          rating={4.8}
          reviewCount={124}
          serviceCount={8}
        />

        <ProviderCard
          id="provider-2"
          name="HomeFix Services"
          category="Home Services"
          location="Rawalpindi"
          rating={4.6}
          reviewCount={89}
          serviceCount={12}
        />
      </div>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Service Cards
      </h3>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <ServiceCard
          id="service-1"
          name="Hair Styling"
          providerName="Ayesha Beauty Studio"
          category="Beauty"
          description="Professional hair styling for events and special occasions."
          price={2500}
          duration={60}
          rating={4.9}
          reviewCount={56}
        />

        <ServiceCard
          id="service-2"
          name="AC Maintenance"
          providerName="HomeFix Services"
          category="Home Services"
          description="Complete air conditioner inspection and maintenance."
          price={1800}
          duration={90}
          rating={4.7}
          reviewCount={31}
        />
      </div>
    </div>

    <div>
      <h3 className="mb-4 text-lg font-semibold">
        Booking Cards
      </h3>

      <div className="space-y-4">
        <BookingCard
          serviceName="Hair Styling"
          providerName="Ayesha Beauty Studio"
          date="October 10, 2026"
          time="02:00 PM"
          status="confirmed"
          price={2500}
          onView={() => {}}
          onAction={() => {}}
          actionLabel="Reschedule"
        />

        <BookingCard
          serviceName="AC Maintenance"
          customerName="Muhammad Ali"
          date="October 12, 2026"
          time="11:00 AM"
          status="pending"
          price={1800}
          onView={() => {}}
          onAction={() => {}}
          actionLabel="Confirm"
        />
      </div>
    </div>
  </div>
</section>
<Modal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  title="Service Details"
  description="Example of a reusable modal."
>
  <div className="space-y-4">
    <p className="text-muted">
      This modal can later be reused for forms,
      service details, filters, and other flows.
    </p>

    <Input
      label="Service Name"
      placeholder="Enter service name"
    />

    <div className="flex justify-end">
      <Button onClick={() => setModalOpen(false)}>
        Done
      </Button>
    </div>
  </div>
</Modal>

<Dialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onConfirm={() => setDialogOpen(false)}
  title="Cancel Booking?"
  description="This action cannot be undone."
  confirmText="Cancel Booking"
  variant="danger"
/>

              <CardContent>
                <div className="flex items-center gap-6">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}