const cron = require('node-cron');
const db = require('./db'); // Your database connection

// Function to process daily returns
async function processDailyReturns() {
    console.log("Starting daily return distribution...");

    try {
        // 1. Fetch all active subscriptions
        const activeSubscriptions = await db.query(
            "SELECT * FROM subscriptions WHERE status = 'active'"
        );

        for (let sub of activeSubscriptions) {
            // 2. Calculate bonus: (Price * Percentage / 100)
            const bonusAmount = sub.plan_price * (sub.daily_percentage / 100);

            // 3. Update User Wallet and Log Transaction
            await db.transaction(async (trx) => {
                // Update wallet balance
                await trx('users').where('id', sub.user_id).increment('wallet_balance', bonusAmount);

                // Insert into transaction history
                await trx('transactions').insert({
                    user_id: sub.user_id,
                    amount: bonusAmount,
                    type: 'daily_bonus',
                    date: new Date()
                });

                // Update last credited date to today
                await trx('subscriptions').where('id', sub.id).update({
                    last_credited: new Date()
                });
            });
        }
        console.log("Daily returns processed successfully.");
    } catch (error) {
        console.error("Error processing daily returns:", error);
    }
}

// 4. Schedule the task to run every day at Midnight (00:00)
cron.schedule('0 0 * * *', () => {
    processDailyReturns();
});
