const fs = require('fs');
const file = './src/app/hangouts/[slug]/hangout-page-client.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove GuestClaimUI import
code = code.replace(/import \{ GuestClaimUI \} from "@\/components\/hangout\/guest-claim-ui";\n/, '');

// 2. Pass guestsToClaim to GuestJoinForm
code = code.replace(/<GuestJoinForm hangoutId=\{hangout\.id\} \/>/, '<GuestJoinForm hangoutId={hangout.id} guestsToClaim={guestsToClaim} />');

// 3. Remove Guest Claim Modal at the end
const guestClaimRegex = /\{\/\* Guest Claim Modal \*\/\}\s*\{guestsToClaim\.length > 0 && \([\s\S]*?<GuestClaimUI hangoutId=\{hangout\.id\} guests=\{guestsToClaim\} \/>\s*\)\}\s*/;
code = code.replace(guestClaimRegex, '');

// 4. Reorder container contents
// Start of container
const containerStart = code.indexOf('<div className="container mx-auto max-w-2xl p-6 space-y-8">');
const containerStartEnd = code.indexOf('\n', containerStart) + 1;

// Sections to extract:
// Participants: starts at: {/* Participants */}
const partsStart = code.indexOf('     {/* Participants */}');
const feedbackStartPos = code.indexOf('     {/* Feedback Trigger (Post-Hangout) *', partsStart);
const partsCode = code.slice(partsStart, feedbackStartPos);

// Feedback: 
const guestJoinStartPos = code.indexOf('     {/* Guest Join / Participation */}', feedbackStartPos);
const feedbackCode = code.slice(feedbackStartPos, guestJoinStartPos);

// Guest Join / RSVP:
const sharedGalleryStartPos = code.indexOf('     {/* Shared Gallery */}', guestJoinStartPos);
const guestJoinCode = code.slice(guestJoinStartPos, sharedGalleryStartPos);

// Shared Gallery (from shared gallery to lightbox)
const lightboxStartPos = code.indexOf('     {/* Lightbox Overlay */}', sharedGalleryStartPos);
const sharedGalleryCode = code.slice(sharedGalleryStartPos, lightboxStartPos);

// Lightbox
const activityStartPos = code.indexOf('     {/* Activity Details & Voting */}', lightboxStartPos);
const lightboxCode = code.slice(lightboxStartPos, activityStartPos);

// Activity Details & Voting
const tasksStartPos = code.indexOf('     {/* Tasks & Expenses */}', activityStartPos);
const activityCode = code.slice(activityStartPos, tasksStartPos);

// Tasks & Expenses
const chatStartPos = code.indexOf('     {/* Chat & Comments */}', tasksStartPos);
const tasksCode = code.slice(tasksStartPos, chatStartPos);

// Chat & Comments goes until end of container (i.e. to the closing div before Guest Claim Modal)
// To find end of chat, find the last closing div before the end of container.
// Actually, earlier we removed the GuestClaim Modal. Wait, let's just slice until the end of the container.
// The container ends where the Guest Claim Modal used to be.
// Wait, the string before guest claim modal is "\n            </div>\n\n            {/* Guest Claim Modal */}"
// Let's just find "            </div>\n" or similar that ends the container.
// Or simpler: chat block is everything from chatStartPos until the closing </div> of container.
const endOfContainer = code.indexOf('        </div>\n    );\n}');
// But wait, the container's closing div is line 574.
// Let's find the closing div:
const chatBlockEnd = code.lastIndexOf('</div>\n', endOfContainer - 1); // wait, not reliable.

const fullContainerInner = code.slice(containerStartEnd, code.indexOf('            </div>\n', chatStartPos)); // chat block + closing div

// We don't slice chatBlockEnd this way, we just slice from chatStartPos to the end of container.
// The end of the container is:
const endDivIndex = code.indexOf('            </div>\n', chatStartPos);
const chatCode = code.slice(chatStartPos, endDivIndex);

// New Order:
// 1. Activity Details
// 2. Guest Join (RSVP)
// 3. Participants
// 4. Feedback
// 5. Tasks
// 6. Gallery
// 7. Lightbox
// 8. Chat

const newContainerInner = activityCode + guestJoinCode + partsCode + feedbackCode + tasksCode + sharedGalleryCode + lightboxCode + chatCode;

code = code.slice(0, containerStartEnd) + newContainerInner + code.slice(endDivIndex);

fs.writeFileSync(file, code);
console.log("Reorder successful");
