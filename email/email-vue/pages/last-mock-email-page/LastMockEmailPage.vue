<template>
  <v-container>
    <div v-if="lastEmail">
      <v-card class="mb-4">
        <v-card-title>
          <h3>{{ lastEmail.subject }}</h3>
        </v-card-title>
        <v-card-text>
          <div v-if="lastEmail.timeSent" class="mb-2">
            <strong>Time Sent:</strong>
            {{ new Date(lastEmail.timeSent).toLocaleString() }}
          </div>
          <div v-if="lastEmail.to && lastEmail.to.length > 0" class="mb-2">
            <strong>{{ strings.email_details.to }}</strong
            >: {{ formatRecipients(lastEmail.to) }}
          </div>
          <div v-if="lastEmail.cc && lastEmail.cc.length > 0" class="mb-2">
            <strong>{{ strings.email_details.cc }}</strong
            >: {{ formatRecipients(lastEmail.cc) }}
          </div>
          <div v-if="lastEmail.bcc && lastEmail.bcc.length > 0" class="mb-2">
            <strong>{{ strings.email_details.bcc }}</strong
            >: {{ formatRecipients(lastEmail.bcc) }}
          </div>
          <div v-if="lastEmail.from" class="mb-2">
            <strong>{{ strings.email_details.from }}</strong
            >: {{ formatRecipients(lastEmail.from) }}
          </div>
          <hr />
          <div v-if="lastEmail.text" class="mb-2">
            <strong v-if="lastEmail.html"
              >{{ strings.email_details.text }}:</strong
            >
            <pre class="text-wrap">{{ lastEmail.text }}</pre>
          </div>
          <div v-if="lastEmail.html" class="mb-2">
            <strong v-if="lastEmail.text"
              >{{ strings.email_details.html }}:</strong
            >
            <!-- eslint-disable-next-line vue/no-v-html - this is text from our server -->
            <div v-html="lastEmail.html"></div>
          </div>
        </v-card-text>
      </v-card>
    </div>
    <div v-else>
      <v-alert type="info">{{ strings.no_emails }}</v-alert>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { last_mock_email_page as strings } from "./LastMockEmailPage.strings.ts";
import { useLastMockEmailPageLoader } from "./LastMockEmailPage.loader.ts";

const { sentEmailsQuery } = useLastMockEmailPageLoader();

if (!sentEmailsQuery.data.value) {
  throw new Error("Failed to load sent emails");
}

const lastEmail = computed(() => {
  const emails = sentEmailsQuery.data.value?.slice() || [];
  emails.sort((a, b) => (b.timeSent || 0) - (a.timeSent || 0));
  return emails && emails.length > 0 ? emails[0] : null;
});

function formatRecipients(
  recipients:
    | string
    | string[]
    | { address: string }
    | { address: string }[]
    | undefined,
): string {
  if (Array.isArray(recipients)) {
    return recipients
      .map((r) => (typeof r === "string" ? r : r.address))
      .join(", ");
  } else if (typeof recipients === "string") {
    return recipients;
  } else if (recipients && recipients.address) {
    return recipients.address;
  }
  return "";
}
</script>
