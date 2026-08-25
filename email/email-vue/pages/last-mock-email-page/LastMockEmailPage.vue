<template>
  <ContentWidth>
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
          <div
            v-if="lastEmail.replyTo && lastEmail.replyTo.length > 0"
            class="mb-2"
          >
            <strong>{{ strings.email_details.replyTo }}</strong
            >: {{ lastEmail.replyTo.join(", ") }}
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
  </ContentWidth>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ContentWidth } from "@saflib/vue/components";
import { last_mock_email_page as strings } from "./LastMockEmailPage.strings.ts";
import { useLastMockEmailPageLoader } from "./LastMockEmailPage.loader.ts";
import {
  formatRecipients,
  sortSentEmailsNewestFirst,
} from "../sent-emails/sent-email-display.ts";

const { sentEmailsQuery } = useLastMockEmailPageLoader();

const lastEmail = computed(() => {
  const emails = sortSentEmailsNewestFirst(sentEmailsQuery.data.value ?? []);
  return emails.length > 0 ? emails[0] : null;
});
</script>
