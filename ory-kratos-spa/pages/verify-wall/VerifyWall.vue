<template>
  <v-container
    v-if="showVerifiedWall"
    class="d-flex flex-column align-center justify-center py-8"
    style="min-height: 48vh"
  >
    <v-card class="pa-8" max-width="500" width="100%">
      <VerifyWallVerifiedIntro />
      <VerifyWallVerifiedActions :continue-href="redirectAfter" />
    </v-card>
  </v-container>
  <v-container
    v-else-if="showUnverifiedWall"
    class="d-flex flex-column align-center justify-center py-8"
    style="min-height: 48vh"
  >
    <v-card class="pa-8" max-width="500" width="100%">
      <VerifyWallIntro :identity-email="identityEmail" />
      <VerifyWallBlockedBody />
      <v-divider class="my-6" />
      <VerifyWallActions :continue-href="redirectAfter" />
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { useVerifyWallLoader } from "./VerifyWall.loader.ts";
import { useVerifyWallPage } from "./useVerifyWallPage.ts";
import VerifyWallActions from "./VerifyWallActions.vue";
import VerifyWallBlockedBody from "./VerifyWallBlockedBody.vue";
import VerifyWallIntro from "./VerifyWallIntro.vue";
import VerifyWallVerifiedActions from "./VerifyWallVerifiedActions.vue";
import VerifyWallVerifiedIntro from "./VerifyWallVerifiedIntro.vue";

const { sessionQuery } = useVerifyWallLoader();

if (sessionQuery.status.value !== "success") {
  throw new Error("Failed to load session");
}

const {
  showVerifiedWall,
  showUnverifiedWall,
  identityEmail,
  redirectAfter,
} = useVerifyWallPage(sessionQuery);
</script>
