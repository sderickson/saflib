<template>
  <ContentWidth variant="full">
    <h1 class="text-h4 mb-4">{{ strings.title }}</h1>

    <v-text-field
      v-model="userEmailFilter"
      :label="strings.filter_label"
      clearable
      density="compact"
      class="mb-4"
      hide-details
    />

    <v-alert v-if="emails.length === 0" type="info">{{ strings.no_emails }}</v-alert>

    <v-row v-else>
      <v-col cols="12" md="4">
        <v-list density="compact" nav class="elevation-1">
          <v-list-item
            v-for="(email, index) in emails"
            :key="`${email.timeSent}-${email.subject}-${index}`"
            :active="selectedIndex === index"
            @click="selectedIndex = index"
          >
            <v-list-item-title class="text-wrap">
              {{ email.subject || "(no subject)" }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-wrap">
              {{ formatRecipients(email.to) }}
              <span v-if="email.timeSent">
                · {{ new Date(email.timeSent).toLocaleString() }}
              </span>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-col>

      <v-col cols="12" md="8">
        <v-card v-if="selectedEmail" class="elevation-1">
          <v-card-title class="d-flex align-start align-sm-center ga-3 flex-wrap">
            <h3 class="flex-grow-1 text-wrap mb-0">
              {{ selectedEmail.subject }}
            </h3>
            <v-switch
              v-if="selectedEmail.text && selectedEmail.html"
              v-model="showTextVersion"
              :label="strings.email_details.text"
              density="compact"
              hide-details
              class="flex-shrink-0"
            />
          </v-card-title>
          <v-card-text>
            <div v-if="selectedEmail.timeSent" class="mb-2">
              <strong>Time Sent:</strong>
              {{ new Date(selectedEmail.timeSent).toLocaleString() }}
            </div>
            <div
              v-if="selectedEmail.to && selectedEmail.to.length > 0"
              class="mb-2"
            >
              <strong>{{ strings.email_details.to }}</strong
              >: {{ formatRecipients(selectedEmail.to) }}
            </div>
            <div
              v-if="selectedEmail.cc && selectedEmail.cc.length > 0"
              class="mb-2"
            >
              <strong>{{ strings.email_details.cc }}</strong
              >: {{ formatRecipients(selectedEmail.cc) }}
            </div>
            <div
              v-if="selectedEmail.bcc && selectedEmail.bcc.length > 0"
              class="mb-2"
            >
              <strong>{{ strings.email_details.bcc }}</strong
              >: {{ formatRecipients(selectedEmail.bcc) }}
            </div>
            <div v-if="selectedEmail.from" class="mb-2">
              <strong>{{ strings.email_details.from }}</strong
              >: {{ formatRecipients(selectedEmail.from) }}
            </div>
            <div
              v-if="selectedEmail.replyTo && selectedEmail.replyTo.length > 0"
              class="mb-2"
            >
              <strong>{{ strings.email_details.replyTo }}</strong
              >: {{ selectedEmail.replyTo.join(", ") }}
            </div>
            <hr />
            <div
              v-if="selectedEmail.text && (showTextVersion || !selectedEmail.html)"
              class="mb-2"
            >
              <pre class="text-wrap">{{ selectedEmail.text }}</pre>
            </div>
            <div v-if="!showTextVersion && selectedEmail.html" class="mb-2">
              <!-- eslint-disable-next-line vue/no-v-html - mock email content from our server -->
              <div v-html="selectedEmail.html"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { sent_emails as strings } from "./SentEmails.strings.ts";
import { useSentEmailsPageLoader } from "./SentEmails.loader.ts";
import {
  formatRecipients,
  sortSentEmailsNewestFirst,
} from "./sent-email-display.ts";

const { userEmailFilter, sentEmailsQuery } = useSentEmailsPageLoader();
const selectedIndex = ref(0);
const showTextVersion = ref(false);

const emails = computed(() =>
  sortSentEmailsNewestFirst(sentEmailsQuery.data.value ?? []),
);

const selectedEmail = computed(() => emails.value[selectedIndex.value] ?? null);

function resetTextVersionToggle() {
  showTextVersion.value = false;
}

watch(emails, (next) => {
  if (next.length === 0) {
    selectedIndex.value = 0;
    showTextVersion.value = false;
    return;
  }
  if (selectedIndex.value >= next.length) {
    selectedIndex.value = 0;
  }
  resetTextVersionToggle();
});

watch(selectedIndex, () => {
  resetTextVersionToggle();
});
</script>
